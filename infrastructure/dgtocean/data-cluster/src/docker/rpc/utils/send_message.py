from clients.kafka.write_broker import create_producer
from typing import Optional, Any

import logging

logger = logging.getLogger(__name__)


def send_message(topic: str, message: Any) -> Optional[Any]:
    producer = create_producer()

    if not producer:
        logger.error("Failed to create Kafka producer")
        return
    future = producer.send(topic, message)
    record_metadata = future.get(timeout=60)
    logger.info(f"Message sent to Kafka: {record_metadata}")

    return record_metadata
