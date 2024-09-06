from typing import Dict, List
from pyspark.sql import SparkSession
from datetime import datetime, timezone
import json

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer

@transformer
def transform(messages: List[Dict], *args, **kwargs):
    transactions = []

    for message in messages:
        try:
            # Decode the byte string
            decoded_message = message.decode('utf-8')
            parsed_message = json.loads(decoded_message)
            transactions.append(parsed_message)
        except Exception as e:
            print(f"did not parse {e}")

    spark = (
        SparkSession
        .builder
        .appName('Spark')
        .getOrCreate()
    )

    rdd = spark.sparkContext.parallelize(transactions)

    filtered_tx_rdd = rdd.filter(
        lambda x: x.get('timestamp') is not None and x.get('data') is not None and isinstance(x.get('data'), dict)
    )

    print(filtered_tx_rdd.take(1))

    transactions_with_timestamp = filtered_tx_rdd.map(
        lambda tx: {
            'tx_timestamp': datetime.fromtimestamp(tx['timestamp'], tz=timezone.utc).isoformat(),
            'tx_txid': tx['data']['txid'],
            'tx_hash': tx['data']['hash'],
            'tx_version': tx['data']['version'],
            'tx_size': tx['data']['size'],
            'tx_vsize': tx['data']['vsize'],
            'tx_weight': tx['data']['weight'],
            'tx_locktime': tx['data']['locktime'],
            'tx_vin': tx['data']['vin'],
            'tx_vout': tx['data']['vout']
        }
    ).collect()

    print(f"got {len(transactions_with_timestamp)} new transactions")

    return transactions_with_timestamp