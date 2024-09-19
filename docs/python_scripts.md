# Bitcoin CLI

Once your bitcoin node is running, see [this](https://github.com/apollo-open-data/apollo-bitcoin/blob/main/docs/bitcoin_node.md) explanation, you should have access to `bitcoin-cli` in your terminal, which includes a set of commands that allows data visualization of blockchain, transactions, mining, wallet, ect.

It can also display blockchain info: `bitcoin-cli -datadir=/mnt/bitcoin_data/bitcoin getblockchaininfo` that should have a response similar to this:

```JSON
{
  "chain": "main",
  "blocks": 861970,
  "headers": 861970,
  "bestblockhash": "0000000000000000000258d08c6d86e8ce3fa5cb8cea6bf1797808afe7224607",
  "difficulty": 92671576265161.06,
  "time": 1726749724,
  "mediantime": 1726746871,
  "verificationprogress": 0.9999980833329548,
  "initialblockdownload": false,
  "chainwork": "00000000000000000000000000000000000000008f5421636b3bd89f6c1f6be9",
  "size_on_disk": 683819048376,
  "pruned": false,
  "warnings": ""
}
```

# Transactions volume metric

To display any metrics using blockchain data we need to make the data go from our node to a readable format in [timescale](https://github.com/apollo-open-data/apollo-bitcoin/blob/main/docs/timescale.md).

I'm using the transactions volume metric for this example, for this we have a timescale table that needs 3 properties: block hash, block timestamp and number of transactions in the block. In order to get this for every block we have two scripts, a backfill one to get the blocks already synched, and one to keep looking for new blocks.

## Historical data

You can find this script in `/bitcoin-droplet/scripts/transactions_volume_historical.py`, a quick explanation is that we fetch batches of 100, starting from the first block until the latest one available, it gets the properties needed and insert in postgres, see the code snippet below:

```python
def fetch_block_data(number):
    """Fetch block data from Bitcoin Core."""
    hash = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblockhash', str(number)], is_json=False).strip()
    block = run_process(['bitcoin-cli', '-datadir=/mnt/bitcoin_data/bitcoin', 'getblock', hash])
    return block

...

def process_batch(start, end):
    """Process a batch of blocks."""
    batch_data = []

    for block_number in range(start, end + 1):
        block = fetch_block_data(block_number)
        tx_count = block['nTx']
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
```

## Real time fetch

So there's another script in `/bitcoin-droplet/scripts/spark_transactions_volume.py` that essentially works the same way to fetch, process and insert the data, but it keeps looking for the newest block available from time to time.

See this snippet below:

```python
def main():
    start_block = 861725 # example of latest block synched
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
```

So we define a start block, usually being the latest block available and we keep fecthing the latest block, if there's a higher number then we fetch, process and insert all. At the end it updates the start block and keep the process happening to do this same thing.
