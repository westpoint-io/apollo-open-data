from pyspark.sql import SparkSession
from datetime import datetime, timezone
import subprocess
import psycopg2
import time
import json

# Define paths and settings
BLOCK_DIR = "/mnt/bitcoin_data/bitcoin/blocks"
DB_HOST = ''
DB_PORT = ''
DB_NAME = ''
DB_USER = ''
DB_PASSWORD = ''
BATCH_SIZE = 100  # Number of blocks to process in each batch
START_BLOCK = 0
END_BLOCK = 861700
SLEEP_INTERVAL = 5  # Interval between checks

# Initialize Spark session
spark = SparkSession.builder \
    .appName("BitcoinTransactionsVolumeBackfill") \
    .master("local[*]") \
    .getOrCreate()

def run_process(list_commands, is_json=True):
    """Run a subprocess command and return the result."""
    data = subprocess.run(list_commands, capture_output=True, text=True, check=True)
    
    if is_json:
        return json.loads(data.stdout)
    
    return data.stdout

def fetch_block_data(number):
    """Fetch block data from Bitcoin Core."""
    hash = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblockhash', str(number)], is_json=False).strip()
    block = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblock', hash])
    return block

def convert_timestamp(timestamp):
    """Convert Unix timestamp to a PostgreSQL-compatible timestamp."""
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()

def insert_into_postgres(data):
    """Insert data into PostgreSQL."""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()

    # Use batch insert to improve performance
    cursor.executemany(
        'INSERT INTO btc_block_transactions (timestamp, total_transactions, hash) VALUES (%s, %s, %s) ON CONFLICT (timestamp, hash) DO NOTHING',
        data
    )

    conn.commit()
    conn.close()

def process_batch(start, end):
    """Process a batch of blocks."""
    batch_data = []

    for block_number in range(start, end + 1):
        block = fetch_block_data(block_number)
        tx_count = block['nTx']
        height = block['height']
        timestamp = convert_timestamp(block['time'])
        
        # Prepare data for batch insertion
        batch_data.append((timestamp, tx_count, block['hash']))
        
        # Process in batches to avoid memory issues
        if len(batch_data) >= BATCH_SIZE:
            insert_into_postgres(batch_data)
            batch_data = []  # Clear batch data to free memory

    # Insert any remaining data
    if batch_data:
        insert_into_postgres(batch_data)

def main():
    """Main function to process blocks from start to end."""
    start_block = START_BLOCK
    end_block = min(start_block + BATCH_SIZE - 1, END_BLOCK)

    while start_block <= END_BLOCK:
        print(f"Processing blocks {start_block} to {end_block}...")
        process_batch(start_block, end_block)
        
        # Move to the next batch
        start_block = end_block + 1
        end_block = min(start_block + BATCH_SIZE - 1, END_BLOCK)
        
        time.sleep(SLEEP_INTERVAL)

if __name__ == "__main__":
    main()

