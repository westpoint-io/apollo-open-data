import json
import ssl
import certifi
import os
from dotenv import load_dotenv
from kafka import KafkaConsumer
from typing import Optional
import logging

# Load environment variables from .env file
load_dotenv()


# Kafka configuration
bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS')
username = os.getenv('KAFKA_USERNAME')
password = os.getenv('KAFKA_PASSWORD')
transaction_topic = os.getenv(
    'KAFKA_TRANSACTION_TOPIC', 'raw-btc-blocks')


# Create a custom SSL context for Kafka
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Add logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Kafka consumer


def create_consumer_for_topic(topic) -> Optional[KafkaConsumer]:
    """
    Create a Kafka consumer for a given topic

    Args:
        topic (str): The topic to consume from

    Returns:
        Optional[KafkaConsumer]: The Kafka consumer
    """
    logger.info(f"Creating consumer for topic: {topic}")
    try:
        consumer = KafkaConsumer(
            topic,
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

        return consumer
    except Exception as e:
        logger.error(f"Failed to connect to Kafka: {e}")
        return None
