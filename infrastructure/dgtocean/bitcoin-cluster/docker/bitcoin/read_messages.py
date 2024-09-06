import json
import os
from dotenv import load_dotenv
from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable
import ssl
import certifi
from bitcoin.core import CTransaction
from bitcoin.core.script import CScript, OP_CHECKSIG
import datetime
import requests

# Load environment variables from .env file
load_dotenv()

# Kafka configuration
bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS')
username = os.getenv('KAFKA_USERNAME')
password = os.getenv('KAFKA_PASSWORD')
transaction_topic = os.getenv(
    'KAFKA_TRANSACTION_TOPIC', 'test_topic')

# Print configuration for debugging
print(f"Bootstrap servers: {bootstrap_servers}")
print(f"Username: {username}")
print(f"Password: {'*' * len(password) if password else 'Not set'}")
print(f"Topic: {transaction_topic}")

# Create a custom SSL context for Kafka
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create Kafka consumer
try:
    consumer = KafkaConsumer(
        transaction_topic,
        bootstrap_servers=bootstrap_servers,
        security_protocol='SASL_SSL',
        sasl_mechanism='PLAIN',
        sasl_plain_username=username,
        sasl_plain_password=password,
        ssl_context=ssl_context,
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        auto_offset_reset='latest'
    )
    print(
        f"Connected to Kafka. Listening for messages on topic: {transaction_topic}")

    # Consume messages
    for message in consumer:
        transaction = message.value
        print(f"Received transaction: {transaction}")

        try:
            tx_dict_str = transaction['data']

            if int(transaction['timestamp']) >= 1239881263:
                print(
                    f"Skipping transaction with timestamp: {transaction['timestamp']}")
                exit(0)

            print(f"Decoded transaction: {json.dumps(tx_dict_str, indent=2)}")
        except Exception as e:
            print(f"Error decoding transaction: {e}")
            print(f"Raw transaction data: {transaction}")

except NoBrokersAvailable:
    print("Error: Unable to connect to Kafka brokers. Please check your configuration and network connectivity.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

finally:
    # Close the consumer (this part will not be reached in this example)
    if 'consumer' in locals():
        consumer.close()


def get_transaction_timestamp(txid):
    url = f"https://api.blockcypher.com/v1/btc/main/txs/{txid}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data.get('confirmed')
    return None
