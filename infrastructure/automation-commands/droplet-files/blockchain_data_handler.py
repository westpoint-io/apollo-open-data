from pyspark.sql import SparkSession
import subprocess
import json
import psycopg2
import time
from datetime import datetime, timezone


# Only host and password are dynamic
def get_db_credentials():
    with open('/root/database_credentials.json', 'r') as f:
        return json.load(f)


# Define paths and settings
BLOCK_DIR = "/mnt/bitcoin_automation_volume/bitcoin"
SLEEP_INTERVAL = 2  # Interval between checks

# PostgreSQL connection parameters
DB_PORT = '5432'
DB_NAME = 'postgres'
DB_USER = 'postgres'

DB_HOST = get_db_credentials()['PG_HOST']
DB_PASSWORD = get_db_credentials()['PG_PASSWORD']

# Initialize Spark session
spark = SparkSession.builder \
    .appName("BitcoinTransactionsVolume") \
    .master("local[*]") \
    .getOrCreate()

def run_process(list_commands, is_json=True):
    data = subprocess.run(
        list_commands, capture_output=True, text=True, check=True)
    if is_json:
        return json.loads(data.stdout)
    return data.stdout

def get_timestamp(time):
    return datetime.fromtimestamp(time, tz=timezone.utc).isoformat()

def get_blockchain_info():
    """Get the blockchain info from Bitcoin Core."""
    blockchain_info = run_process(
        ['bitcoin-cli', f'-datadir={BLOCK_DIR}', 'getblockchaininfo'])

    return blockchain_info

def get_latest_block(blockchain_info):
    """Get the latest block number from Bitcoin Core."""
    blocks = blockchain_info.get('blocks')
    return blocks

def get_latest_headers(blockchain_info):
    """Get the latest block number from Bitcoin Core."""
    headers = blockchain_info.get('headers')
    return headers


def fetch_block_data(number):
    """Fetch block data from Bitcoin Core."""
    hash = run_process(['bitcoin-cli', f'-datadir={BLOCK_DIR}',
                       'getblockhash', str(number)], is_json=False).strip()
    print(f"height: {number} | hash: {hash}")

    block = run_process(
        ['bitcoin-cli', f'-datadir={BLOCK_DIR}', 'getblockheader', hash])
    return block


def process_block(number):
    """Process a single block and return its data."""
    block = fetch_block_data(number)
    timestamp = get_timestamp(block['time'])

    return {
        'hash': block['hash'],
        'timestamp': timestamp,
        'difficulty': block['difficulty'],
        'height': block['height'],
        'nTx': block['nTx']
    }

def process_headers(start_header):
    last_chain_tip = run_process(['bitcoin-cli', f'-datadir={BLOCK_DIR}', 'getchaintips'])[0]
    
    if last_chain_tip['status'] == 'active':
        print(f"latest header already active")
        return

    data_for_timescale = []

    latest_header = last_chain_tip
    headers_range = range(start_header, int(latest_header['height']) + 1)
    current_hash = last_chain_tip['hash']
    
    for _ in headers_range:
        data = run_process(['bitcoin-cli', f'-datadir={BLOCK_DIR}', 'getblockheader', current_hash])
        data_for_timescale.append({
            'hash': data['hash'],
            'timestamp': get_timestamp(data['time']),
            'difficulty': data['difficulty'],
            'height': data['height']
        })
        
        current_hash = data['previousblockhash']
        
    insert_into_postgres(data_for_timescale)


"""Insert data into PostgreSQL."""
def insert_into_postgres(partitions):
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()

    for partition in partitions:
        cursor.execute(
            f"""INSERT INTO l0_btc_blocks ({", ".join(partition.keys())}) VALUES ({", ".join(["%s"] * len(partition))}) ON CONFLICT (timestamp, hash)
            DO UPDATE SET
            {", ".join([f"{key} = EXCLUDED.{key}" for key in partition.keys()])}""",
            tuple(partition.values())
        )

    conn.commit()
    conn.close()


def main():
    blockchain_info = get_blockchain_info()
    
    start_block = 0
    start_header = 0
    latest_block = get_latest_block(blockchain_info)
    latest_header = get_latest_headers(blockchain_info)
    
    initial_download = blockchain_info.get('initialblockdownload')

    print(f"Latest block {latest_block} |||| Latest header {latest_header}")

    if latest_block is None:
        print("Error: Could not get the latest block.")
        return

    BATCH_SIZE = 10

    while True:
        if latest_block > start_block:
            print(
                f"New blocks being processed {start_block} -> {latest_block}")

            # Process blocks in batches of 10
            for batch_start in range(start_block, latest_block + 1, BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, latest_block + 1)
                blocks_range = range(batch_start, batch_end)

                # Parallelize block processing using Spark
                rdd = spark.sparkContext.parallelize(blocks_range)
                data = rdd.map(process_block).collect()

                # Batch insert into PostgreSQL
                insert_into_postgres(data)

                print(f"Processed batch: {batch_start} -> {batch_end - 1}")

            start_block = latest_block
            print(f"New start block {start_block}")
        
        if latest_header > start_header and latest_header > start_block and not initial_download:
            print(f"New headers are being processed {start_header} -> {latest_header}")
            if start_block > start_header:
                process_headers(start_block)
            else:
                process_headers(start_header)

            start_header = latest_header

        time.sleep(SLEEP_INTERVAL)
        blockchain_info = get_blockchain_info()
        latest_block = get_latest_block(blockchain_info)
        latest_header = get_latest_headers(blockchain_info)
        initial_download = blockchain_info.get('initialblockdownload')


if __name__ == "__main__":
    main()
