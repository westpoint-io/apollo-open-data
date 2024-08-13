# TimescaleDB 🦁

We use TimescaleDB to store the raw data from the blockchain and quickly aggregate it for the dashboard. TimescaleDB is an open-source time-series database that is built on top of PostgreSQL. It is designed to scale and handle high volumes of data, making it a perfect fit for our use case.

If you're interested in learning more about TimescaleDB, you can check out their [official documentation](https://docs.timescale.com/).

## Continuous Aggregate

One of the main reasons why we chose TimescaleDB is because of its [continuous aggregate](https://docs.timescale.com/use-timescale/latest/continuous-aggregates/) feature. Continuous aggregates allow us to precompute and store aggregate data in real-time, which significantly improves query performance.

<br>
For example to aggregate transactions volume daily we can use the following SQL query:

```sql
  SELECT time_bucket('1 day', timestamp) AS "time",
    count(hash) AS transactions
  FROM raw_bitcoin_transactions
  GROUP BY (time_bucket('1 day', timestamp));
```

<br>
This would be turned into a materialized view with timescaledb.continuous option and materialized_only set to false:

```sql
  CREATE MATERIALIZED VIEW daily_transactions
  WITH (timescaledb.continuous, timescaledb.materialized_only=false) AS
  SELECT time_bucket('1 day', timestamp) AS "time",
    count(hash) AS transactions
  FROM raw_bitcoin_transactions
  GROUP BY (time_bucket('1 day', timestamp));
```

_`timescaledb.materialized_only=false` option is important because it allows the materialized view to be updated in real-time._
<br>
And finally we need to setup a policy to refresh the materialized view:

```sql
  SELECT add_continuous_aggregate_policy('daily_transactions',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');
```
