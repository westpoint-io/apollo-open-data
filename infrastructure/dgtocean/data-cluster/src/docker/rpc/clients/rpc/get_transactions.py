from clients.rpc.main import rpc_connection, recreate_rpc_connection
from typing import Optional, List
from services.send_slack_message import send_error_message_to_slack
from consts.block_transactions import BlockTransactionDetails

import logging
import time
import copy

logger = logging.getLogger(__name__)


def process_batch(commands: List[List[str]], situation: Optional[str] = None):
    try:
        result = rpc_connection.batch_(commands)
        if not result:
            raise ValueError("Received empty result from RPC call")
        return result
    except Exception as e:
        logger.error(f"Error in process_batch: {str(e)}")
        logger.error(
            f'Failed with commands on {situation}:\n{commands}')
        raise


def batch_with_retry(commands: List[List[str]], situation: Optional[str] = None, total_retries: int = 5):
    retries = 0
    while retries < total_retries:
        try:
            # Create a new copy of commands for each attempt
            local_commands = copy.deepcopy(commands)

            return process_batch(local_commands, situation)
        except Exception as e:
            logger.error(f"Error in batch_with_retry: {str(e)}")
            retries += 1
            sleep_time = 20 * retries
            # Recreate the connection if it's the first retry
            if retries in [1, 3]:
                recreate_rpc_connection()
            logger.info(f"Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)

    raise Exception(f"Failed to process batch after {total_retries} retries")


def process_batch_on_demand(commands: List[List[str]], situation: Optional[str] = None):
    try:
        return rpc_connection.on_demand_batch_(commands)
    except Exception as e:
        logger.error(f"Error in process_batch_on_demand: {str(e)}")
        logger.error(f'Failed with commands on {situation}:\n{commands}')
        raise


def batch_with_retry_on_demand(commands: List[List[str]], situation: Optional[str] = None, total_retries: int = 5):
    retries = 0
    while retries < total_retries:
        try:
            local_commands = copy.deepcopy(commands)
            return process_batch_on_demand(local_commands, situation)
        except Exception as e:
            logger.error(f"Error in batch_with_retry_on_demand: {str(e)}")
            retries += 1
            sleep_time = 20 * retries
            if retries in [1, 3]:
                recreate_rpc_connection()
            logger.info(f"Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)

    raise Exception(f"Failed to process batch after {total_retries} retries")


def get_transactions_from_block(block_count: int, block_height: int, batch_size=5, max_batch_requests=400, RETRIES=4):
    logger.info(
        f'********* THIS IS GONNA STOP ON BLOCK {block_count} *********')
    time.sleep(10)

    for start_height in range(block_height, block_count + 1, max_batch_requests):
        end_height = min(start_height + max_batch_requests - 1, block_count)

        i = start_height
        while i <= end_height:
            batch_end = min(i + batch_size - 1, end_height)
            logger.info(f'Processing blocks {i}-{batch_end}')
            logger.info(f'Ends in: {end_height}')

            block_retries = 0
            while True:
                if block_retries > RETRIES:
                    logger.error(
                        f"Failed to process blocks {i}-{batch_end} after {RETRIES} retries")
                    send_error_message_to_slack(
                        f"Failed to process blocks {i}-{batch_end} after {RETRIES} retries", (i, batch_end))
                    exit(0)
                try:
                    # Get block hashes in batch
                    commands_getblockhash = [["getblockhash", height]
                                             for height in range(i, batch_end + 1)]

                    block_hashes = batch_with_retry(
                        commands_getblockhash, 'getblockhash')
                    logger.info(
                        f"Fetched {len(block_hashes)} hashes for blocks {i}-{batch_end}")

                    time.sleep(5)

                    # Get ----full----> (temporarily getting only tx hashses, not full blocks) blocks in batch
                    commands_getblock = [["getblock", h, BlockTransactionDetails.BLOCK_WITH_TRANSACTIONS_DETAILS]
                                         for h in block_hashes]
                    blocks = batch_with_retry(commands_getblock, 'getblock')
                    logger.info(
                        f"Fetched {len(blocks)} full blocks for blocks {i}-{batch_end}")

                    for block in blocks:
                        tx_length = len(block['tx'])
                        logger.info(
                            f"Processing {tx_length} transactions from block {block['height']}")

                        for tx in block['tx']:
                            yield {'type': 'transaction', 'data': tx, 'blockheight': block['height'], 'timestamp': block['time']}

                        logger.info(
                            f"Finished processing transactions from block {block['height']}")

                    logger.info(
                        f"Processed blocks {i}-{batch_end}. Sleeping for 5 seconds...")
                    time.sleep(5)
                    break  # Exit the while True loop if successful

                except Exception as e:
                    logger.error(
                        f"Error processing blocks {i}-{batch_end}: {str(e)}")
                    logger.info("Sleeping for 60 seconds before retrying...")
                    time.sleep(20)
                    block_retries += 1
                    # The loop will continue, retrying the same batch

            i = batch_end + 1  # Move to the next batch only after successful processing


def get_transactions_from_block_on_demand(block_count: int, block_height: int, batch_size=20, max_batch_requests=400, RETRIES=4):
    logger.info(
        f'********* THIS IS GONNA STOP ON THE BLOCK {block_count} *********')
    time.sleep(2)

    for start_height in range(block_height, block_count + 1, max_batch_requests):
        end_height = min(start_height + max_batch_requests - 1, block_count)

        i = start_height
        while i <= end_height:
            batch_end = min(i + batch_size - 1, end_height)
            logger.info(f'Processing blocks {i}-{batch_end}')
            logger.info(f'Ends in: {end_height}')

            block_retries = 0
            while True:
                if block_retries > RETRIES:
                    logger.error(
                        f"Failed to process blocks {i}-{batch_end} after {RETRIES} retries")
                    send_error_message_to_slack(
                        f"Failed to process blocks {i}-{batch_end} after {RETRIES} retries", (i, batch_end))
                    exit(0)
                try:
                    # Get block hashes in batch
                    commands_getblockhash = [["getblockhash", height]
                                             for height in range(i, batch_end + 1)]
                    block_hashes = list(batch_with_retry_on_demand(
                        commands_getblockhash, 'getblockhash'))
                    logger.info(
                        f"Fetched {len(block_hashes)} hashes for blocks {i}-{batch_end}")

                    time.sleep(2)

                    # Get full blocks in batch
                    commands_getblock = [
                        ["getblock", h, BlockTransactionDetails.BLOCK_WITH_TRANSACTIONS_DETAILS] for h in block_hashes]
                    blocks_generator = batch_with_retry_on_demand(
                        commands_getblock, 'getblock')

                    for block in blocks_generator:
                        tx_length = len(block['tx'])
                        logger.info(
                            f"Processing {tx_length} transactions from block {block['height']}")

                        for tx in block['tx']:
                            yield {'type': 'transaction', 'data': tx, 'blockheight': block['height'], 'timestamp': block['time']}

                        logger.info(
                            f"Finished processing transactions from block {block['height']}")

                    logger.info(
                        f"Processed blocks {i}-{batch_end}. Sleeping for 5 seconds...")
                    time.sleep(3)
                    break  # Exit the while True loop if successful

                except Exception as e:
                    logger.error(
                        f"Error processing blocks {i}-{batch_end}: {str(e)}")
                    logger.info("Sleeping for 60 seconds before retrying...")
                    time.sleep(20)
                    block_retries += 1

            i = batch_end + 1  # Move to the next batch only after successful processing
