import logging
from services.send_transactions_to_kafka import send_transactions_to_kafka_from_block

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INITIAL_BLOCK_HEIGHT_FOR_FIRST_JUNE = 259933


def main_process():
    current_init_block_height = INITIAL_BLOCK_HEIGHT_FOR_FIRST_JUNE

    # while True:
    logger.info("Starting main process...")

    logger.info("Starting transactions process...")

    last_block_height = send_transactions_to_kafka_from_block(
        current_init_block_height)

    logger.info(
        f"Transactions process finished. Last block height: {last_block_height}")


if __name__ == "__main__":
    main_process()
