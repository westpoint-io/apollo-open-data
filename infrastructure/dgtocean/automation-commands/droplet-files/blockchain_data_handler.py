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
BLOCK_DIR = "/mnt/bitcoin_automation_volume/bitcoin/blocks"
SLEEP_INTERVAL = 5  # Interval between checks

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


def get_latest_block():
    """Get the latest block number from Bitcoin Core."""
    blocks = run_process(
        ['bitcoin-cli', '-datadir=/mnt/bitcoin_automation_volume/bitcoin', 'getblockchaininfo']).get('blocks')
    return blocks


def fetch_block_data(number):
    """Fetch block data from Bitcoin Core."""
    hash = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_automation_volume/bitcoin',
                       'getblockhash', str(number)], is_json=False).strip()
    print(f"height: {number} | hash: {hash}")

    block = run_process(
        ['bitcoin-cli', '-datadir=/mnt/bitcoin_automation_volume/bitcoin', 'getblock', hash])
    return block


def process_block(number):
    """Process a single block and return its data."""
    block = fetch_block_data(number)
    time = block['time']

    timestamp = datetime.fromtimestamp(time, tz=timezone.utc).isoformat()

    return (block['hash'], timestamp, block['nTx'], block['height'], block['difficulty'])


def insert_into_postgres(partitions):
    """Insert data into PostgreSQL."""
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
            'INSERT INTO l0_btc_blocks (hash, timestamp, nTx, height, difficulty) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (timestamp, hash) DO NOTHING',
            partition
        )

    conn.commit()
    conn.close()


def main():
    start_block = 0
    latest_block = get_latest_block()
    print(f"Latest block |||| {latest_block} ||||")

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
        else:
            print(f"No new blocks. Latest block is still {latest_block}.")

        time.sleep(SLEEP_INTERVAL)
        latest_block = get_latest_block()
        print(f"Latest block - new fetch {latest_block}")


if __name__ == "__main__":
    main()
