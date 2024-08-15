from typing import Dict, List
from pyspark.sql import SparkSession
from datetime import datetime, timezone
import json

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer

@transformer
def transform(messages: List[Dict], *args, **kwargs):
    blocks = []

    for message in messages:
        try:
            # Decode the byte string
            decoded_message = message.decode('utf-8')
            parsed_message = json.loads(decoded_message)
            blocks.append(parsed_message)
        except Exception as e:
            print(f"did not parse {e}")

    print(f"total blocks: {len(blocks)}")

    spark = (
        SparkSession
        .builder
        .appName('Spark')
        .getOrCreate()
    )

    rdd = spark.sparkContext.parallelize(blocks)

    filtered_rdd = rdd.filter(
        lambda x: x.get('hash', None) is not None and x.get('type', '') is not "transaction" 
    )

    unique_per_hash_rdd = filtered_rdd.map(lambda x: (x['hash'], x)).reduceByKey(lambda x, y: x).map(lambda x: x[1])

    blocks_formatted = unique_per_hash_rdd.map(
      lambda x: {
        "block_time": datetime.fromtimestamp(x['time'], tz=timezone.utc).isoformat(),
        "block_mediantime": datetime.fromtimestamp(x['mediantime'], tz=timezone.utc).isoformat(),
        "block_size": x['size'],
        # add all x properties except tx, time and mediantime
        **{k: v for k, v in x.items() if k not in ['tx', 'time', 'mediantime', 'size']},
      }
    ).collect()

    return blocks_formatted
