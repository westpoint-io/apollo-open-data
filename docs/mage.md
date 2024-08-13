# Mage 🧙‍♂️

We can say Mage it's the younger (and cooler) brother of Apache Airflow, it's an open source data pipeline tool for transforming and integrating data.

## How do we use it?

We setup mage pipelines that load data from Kafka topics, transform it and then exports it to TimescaleDB. This allows us to have a real-time data pipeline that processes the data as it comes in.

See the details below to understand the basics of a Mage pipeline:

### Data loader

It is as easy as defining the credentials and the topic to consume from, here is an example of a data loader configuration:

```yml
connector_type: kafka
bootstrap_server: "kafka-server-url"
topic: transactions_topic
consumer_group: mage_transactions
include_metadata: false
api_version: 0.10.2
auto_offset_reset: earliest

security_protocol: "SASL_SSL"
sasl_config:
  mechanism: "PLAIN"
  username: user
  password: password
ssl_config:
  cafile: "/mage_data/cafile.crt"

serde_config:
  serialization_method: RAW_VALUE
```

### Transformer

The transformer allow us to do anything with the data, since it's a Python script you can use any library you want, here is an example of a transformer script:

```python
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
        lambda x: x.get('timestamp') is not None and x.get('txid') is not None
    )

    transactions_with_timestamp = filtered_tx_rdd.collect()

    return transactions_with_timestamp
```

### Data exporter

Then we just configure another yaml file to export the data to TimescaleDB, here is an example of a data exporter configuration:

```yml
connector_type: postgres
database: postgres
host: hostname
password: password
port: 5432
schema: public
username: user
table: table_name
unique_conflict_method: DO NOTHING
unique_constraints:
  - tx_txid
  - tx_hash
  - tx_timestamp
```

If you want to learn more about Mage, you can check out their [official website](https://mage.ai).
