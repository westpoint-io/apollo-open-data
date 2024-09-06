import json
import ssl
import certifi
import os
from dotenv import load_dotenv
from kafka import KafkaProducer
from kafka.errors import KafkaError
from typing import Optional
import logging

# Load environment variables from .env file
load_dotenv()

# Kafka configuration
bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS')
username = os.getenv('KAFKA_USERNAME')
password = os.getenv('KAFKA_PASSWORD')
block_topic = os.getenv('KAFKA_BLOCK_TOPIC', 'raw-btc-blocks')
transaction_topic = os.getenv(
    'KAFKA_TRANSACTION_TOPIC', 'raw-btc-transactions')


# Create a custom SSL context for Kafka
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Add logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


producer = None


def create_producer() -> Optional[KafkaProducer]:
    """
    Create a Kafka producer

    Returns:
        Optional[KafkaProducer]: The Kafka producer
    """
    global producer
    if producer is not None:
        return producer
    try:
        producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            security_protocol='SASL_SSL',
            sasl_mechanism='PLAIN',
            sasl_plain_username=username,
            sasl_plain_password=password,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            ssl_context=ssl_context,
            acks='all',
            retries=3,
            retry_backoff_ms=1000,
            request_timeout_ms=30000,  # 30 seconds
            max_block_ms=60000,
            max_request_size=209715200,  # 200mb
            buffer_memory=33554432,    # Optional: Increase buffer memory (default is 32MB)
            batch_size=163840,
        )
        logger.info("Successfully connected to Kafka")
        return producer
    except KafkaError as e:
        logger.error(f"Failed to connect to Kafka: {e}")
        return None
