import zmq
import json
import time
import ssl
import certifi
import os
import subprocess
from dotenv import load_dotenv
from kafka import KafkaProducer
from kafka.errors import KafkaError
import logging
import sys
import struct
import hashlib
import requests
import datetime

# Load environment variables from .env file
load_dotenv()

# Kafka configuration
bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS')
username = os.getenv('KAFKA_USERNAME')
password = os.getenv('KAFKA_PASSWORD')
block_topic = os.getenv('KAFKA_BLOCK_TOPIC', 'raw-btc-blocks')
transaction_topic = os.getenv(
    'KAFKA_TRANSACTION_TOPIC', 'raw-btc-transactions')

# ZeroMQ configuration
zmq_address = 'tcp://127.0.0.1:29000'

# Create a custom SSL context for Kafka
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Add logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def send_message(topic, message):
    """Send a message to the specified Kafka topic."""
    try:
        future = producer.send(topic, message)
        record_metadata = future.get(timeout=10)
        print(
            f"Message sent successfully to {record_metadata.topic} [{record_metadata.partition}] at offset {record_metadata.offset}")
    except KafkaError as e:
        print(f"Failed to send message: {e}")


def run_bitcoin_cli(command):
    """Run a bitcoin-cli command and return the result."""
    try:
        # Check if a wallet is loaded
        wallet_info = subprocess.run(
            ['bitcoin-cli', 'getwalletinfo'], capture_output=True, text=True)
        if 'No wallet is loaded' in wallet_info.stderr:
            # Create a new wallet if none exists
            subprocess.run(
                ['bitcoin-cli', 'createwallet', 'default'], check=True)
            logger.info("Created new wallet 'default'")

        # Run the actual command
        result = subprocess.run(
            ['bitcoin-cli'] + command.split(), capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        logger.error(f"bitcoin-cli error: {e.stderr}")
        return None


def is_node_synced():
    """Check if the Bitcoin node is fully synced."""
    blockchain_info = run_bitcoin_cli('getblockchaininfo')
    if blockchain_info is None:
        return False
    is_synced = blockchain_info['blocks'] == blockchain_info['headers'] and not blockchain_info['initialblockdownload']
    is_pruned = blockchain_info.get('pruned', False)
    logger.info(f"Node sync status: {is_synced}, Pruned: {is_pruned}")
    return is_synced


def get_earliest_block_height():
    """Get the earliest block height available in the pruned node."""
    chain_info = run_bitcoin_cli('getblockchaininfo')
    if chain_info is None:
        return None
    return chain_info['pruneheight']


def get_transactions_since(start_height):
    """Get all transactions since the given block height."""
    current_height = run_bitcoin_cli('getblockcount')
    if current_height is None:
        return

    for height in range(start_height, current_height + 1):
        block_hash = run_bitcoin_cli(f'getblockhash {height}')
        if block_hash is None:
            continue

        block = run_bitcoin_cli(f'getblock {block_hash} 2')
        if block is None:
            continue

        for tx in block['tx']:
            yield {'type': 'transaction', 'data': tx['hex'], 'blockheight': height, 'timestamp': block['time']}


def process_raw_block(raw_block):
    """Process the raw block data received from ZMQ."""
    try:
        # The first 80 bytes of a block contain the header
        header = raw_block[:80]

        # Unpack the header
        version, prev_block, merkle_root, timestamp, bits, nonce = struct.unpack(
            '<I32s32sIII', header)

        # Convert bytes to hex strings where appropriate
        prev_block = prev_block[::-1].hex()  # Reverse and convert to hex
        merkle_root = merkle_root[::-1].hex()  # Reverse and convert to hex

        # Calculate the block hash
        block_hash = double_sha256(header)[::-1].hex()

        return {
            'type': 'block',
            'data': {
                'hash': block_hash,
                'version': version,
                'previousblockhash': prev_block,
                'merkleroot': merkle_root,
                'time': timestamp,
                'bits': bits,
                'nonce': nonce,
            },
            'raw_data': raw_block.hex()
        }
    except Exception as e:
        logger.error(f"Error processing raw block: {e}")
        return None


def double_sha256(header):
    """Perform double SHA256 hash."""
    return hashlib.sha256(hashlib.sha256(header).digest()).digest()


def process_raw_tx(raw_tx):
    """Process the raw transaction data received from ZMQ."""
    try:
        # Decode the raw transaction
        decoded_tx = run_bitcoin_cli(f'decoderawtransaction {raw_tx.hex()}')

        if decoded_tx is None:
            return None

        txid = decoded_tx['txid']

        # Check if it's a coinbase transaction
        is_coinbase = len(decoded_tx['vin']) == 1 and \
            decoded_tx['vin'][0].get('coinbase') is not None

        # Try to get transaction info using getrawtransaction
        try:
            tx_info = run_bitcoin_cli(f'getrawtransaction {txid} true')
            if tx_info and 'blockhash' in tx_info:
                # Transaction is in a block
                timestamp = tx_info['blocktime']
                is_mempool = False
            else:
                # Transaction is in mempool
                timestamp = None
                is_mempool = True
        except Exception as e:
            # If getrawtransaction fails (e.g., due to pruning), use current time
            logger.warning(
                f"Could not retrieve transaction info for {txid}: {e}")
            try:
                timestamp = None
            except Exception as e:
                logger.error(f"Error getting transaction timestamp: {e}")
                timestamp = None
            is_mempool = True

        tx_data = {
            "type": "transaction",
            "data": decoded_tx,
            "txid": txid,
            "is_coinbase": is_coinbase,
            "timestamp": timestamp,
            "is_mempool": is_mempool
        }

        return tx_data
    except Exception as e:
        logger.error(f"Error processing raw transaction {raw_tx.hex()}: {e}")
        return None


def testing_process_transaction(raw_tx):
    """Process the raw transaction data received from ZMQ."""
    try:
        # Decode the raw transaction
        decoded_tx = run_bitcoin_cli(f'decoderawtransaction {raw_tx.hex()}')

        if decoded_tx is None:
            return None

        txid = decoded_tx['txid']

        # Check if it's a coinbase transaction
        is_coinbase = len(decoded_tx['vin']) == 1 and \
            decoded_tx['vin'][0].get('coinbase') is not None

        # Try to get transaction info using getrawtransaction
        tx_info = run_bitcoin_cli(f'getrawtransaction {txid} true')

        if tx_info and 'blockhash' in tx_info:
            # Transaction is in a block
            timestamp = tx_info['blocktime']
            block_height = tx_info.get('height')
            is_mempool = False
        else:
            # Transaction is in mempool or timestamp not found
            timestamp = None
            block_height = None
            is_mempool = True

        tx_data = {
            "type": "transaction",
            "data": decoded_tx,
            "txid": txid,
            "is_coinbase": is_coinbase,
            "timestamp": timestamp,
            "block_height": block_height,
            "is_mempool": is_mempool
        }

        return tx_data
    except Exception as e:
        logger.error(f"Error processing raw transaction {raw_tx.hex()}: {e}")
        return None


def main():
    logger.info("Starting script...")

    # Calculate the start and end times
    now = datetime.datetime.now()
    yesterday_10am = (now - datetime.timedelta(days=1)
                      ).replace(hour=10, minute=0, second=0, microsecond=0)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    context = zmq.Context()
    socket_general = context.socket(zmq.SUB)
    socket_general.connect(zmq_address)
    socket_general.subscribe(b'rawblock')
    socket_general.subscribe(b'rawtx')

    poller = zmq.Poller()
    poller.register(socket_general, zmq.POLLIN)

    while True:
        try:
            socks = dict(poller.poll(1000))  # Poll for 1 second
            if socket_general in socks and socks[socket_general] == zmq.POLLIN:
                topic, body, _ = socket_general.recv_multipart()

                if topic == b'rawblock':
                    block_data = process_raw_block(body)
                    if block_data:
                        block_time = datetime.datetime.fromtimestamp(
                            block_data['data']['time'])
                        if yesterday_10am <= block_time < today:
                            # send_message(block_topic, block_data)
                            logger.info(
                                f"Sent block data to Kafka: {block_data['data']['hash']}")
                        else:
                            logger.info(
                                f"Skipped block outside time range: {block_data['data']['hash']}")

                elif topic == b'rawtx':
                    tx_data = process_raw_tx(body)
                    tx_testing_data = testing_process_transaction(body)
                    if tx_data and tx_testing_data:
                        tx_time = datetime.datetime.fromtimestamp(
                            tx_data['timestamp']) if tx_data['timestamp'] else None
                        if tx_time and yesterday_10am <= tx_time < today:
                            try:
                                # send_message(transaction_topic,
                                #              tx_testing_data)
                                log_msg = f"Sent transaction data to Kafka: {tx_data['txid']}"
                                if 'block_height' in tx_data:
                                    log_msg += f" (Block: {tx_data['block_height']})"
                                elif tx_data.get('in_mempool'):
                                    log_msg += " (In mempool)"
                                logger.info(log_msg)
                            except Exception as testing_error:
                                logger.error(
                                    f"Couldn't send Testing data for transaction: {testing_error}")
                        else:
                            logger.info(
                                f"Skipped transaction outside time range: {tx_data['txid']}")

                else:
                    logger.error(f"Unknown topic: {topic}")

        except zmq.ZMQError as e:
            logger.error(f"ZMQ Error: {e}")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(1)
        except KeyboardInterrupt:
            break

    socket_general.close()
    context.term()
    # producer.close()


if __name__ == "__main__":
    logger.info("Entering main function")
    main()
