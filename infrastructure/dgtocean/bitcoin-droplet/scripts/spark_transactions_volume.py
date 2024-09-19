from pyspark.sql import SparkSession
import subprocess
import json
import psycopg2
import time
from datetime import datetime, timezone


# Define paths and settings
BLOCK_DIR = "/mnt/bitcoin_data/bitcoin/blocks"
SLEEP_INTERVAL = 5  # Interval between checks

# PostgreSQL connection parameters
DB_HOST = ''
DB_PORT = ''
DB_NAME = ''
DB_USER = ''
DB_PASSWORD = ''

# Initialize Spark session
spark = SparkSession.builder \
    .appName("BitcoinTransactionsVolume") \
    .master("local[*]") \
    .getOrCreate()

def run_process(list_commands, is_json=True):
    data = subprocess.run(list_commands, capture_output=True, text=True, check=True)
    if is_json:
        return json.loads(data.stdout)
    return data.stdout

def get_latest_block():
    """Get the latest block number from Bitcoin Core."""
    blocks = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblockchaininfo']).get('blocks')
    return blocks

def fetch_block_data(number):
    """Fetch block data from Bitcoin Core."""
    hash = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblockhash', str(number)], is_json=False).strip()
    block = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblock', hash])
    return block

def process_block(number):
    """Process a single block and return its data."""
    block = fetch_block_data(number)
    tx_count = block['nTx']
    hash = block['hash']

    timestamp = datetime.fromtimestamp(block['time'], tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    return (timestamp, tx_count, hash)

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
        cursor.execute('INSERT INTO btc_block_transactions (timestamp, total_transactions, hash) VALUES (%s, %s, %s) ON CONFLICT (timestamp, hash) DO NOTHING', partition)

    conn.commit()
    conn.close()

def main():
    start_block = 861725
    latest_block = get_latest_block()
    print(f"Latest block |||| {latest_block} ||||")
    
    if latest_block is None:
        print("Error: Could not get the latest block.")
        return

    while True:
        if latest_block > start_block:
            print(f"New blocks being processed {start_block} -> {latest_block}")
            blocks_range = range(start_block, latest_block)

            # Parallelize block processing using Spark
            rdd = spark.sparkContext.parallelize(blocks_range)
            data = rdd.map(process_block).collect()

            # Batch insert into PostgreSQL
            insert_into_postgres(data)
            
            start_block = latest_block
            print(f"New start block {start_block}")
        else:
            print(f"No new blocks. Latest block is still {latest_block}.")

        time.sleep(SLEEP_INTERVAL)
        latest_block = get_latest_block()
        print(f"Latest block - new fetch {latest_block}")

if __name__ == "__main__":
    main()
