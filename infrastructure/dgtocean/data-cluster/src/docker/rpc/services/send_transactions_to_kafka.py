import concurrent.futures
import datetime
import logging
from dotenv import load_dotenv
from utils.send_message import send_message
from utils.convert_decimal import convert_decimal
from clients.rpc.get_transactions import get_transactions_from_block_on_demand
from clients.rpc.main import rpc_connection

load_dotenv()

# Add logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TRANSACTIONS_TOPIC = "raw-btc-transactions"

# Limit for concurrent transactions
MAX_CONCURRENT_TRANSACTIONS = 20


def send_transaction_to_kafka(tx):
    try:
        kafka_message = {
            **convert_decimal(tx),  # type: ignore
            'sent_at': datetime.datetime.utcnow().isoformat()
        }
        send_message(TRANSACTIONS_TOPIC, kafka_message)
        return True
    except Exception as e:
        logger.error(f"Error sending transaction to Kafka: {e}")
        return False


def send_transactions_to_kafka_from_block(block_height: int) -> int:
    logger.info("Starting script...")

    try:
        block_count = rpc_connection("getblockcount")
        logger.info(f"Block count: {block_count}")
    except Exception as e:
        logger.error(f"Error getting block count: {e}")
        raise

    transactions = get_transactions_from_block_on_demand(
        block_count, block_height)

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_CONCURRENT_TRANSACTIONS) as executor:
        batch = []
        for tx in transactions:
            batch.append(tx)
            if len(batch) >= MAX_CONCURRENT_TRANSACTIONS:
                futures = {executor.submit(
                    send_transaction_to_kafka, t): t for t in batch}
                for future in concurrent.futures.as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        logger.error(f"Transaction failed: {e}")
                batch = []

        # Process any remaining transactions
        if batch:
            futures = {executor.submit(
                send_transaction_to_kafka, t): t for t in batch}
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    logger.error(f"Transaction failed: {e}")

    return block_count
