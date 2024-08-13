# Grafana 📊

Grafana is an open-source analytics and monitoring platform that allows you to query, visualize, alert on, and understand your metrics no matter where they are stored. In the Apollo Project, we use Grafana to visualize real-time blockchain data.

## How do we use it?

We use Grafana to create dashboards that display real-time data from the Bitcoin blockchain. The data is stored in TimescaleDB and is queried using SQL queries. Grafana allows us to create visualizations such as line charts, bar charts, and tables to display the data in a user-friendly format.

Here is an example of a Grafana query to display the number of transactions per day:

```sql
SELECT
  time,
  transactions
FROM bitcoin_transactions_volume_daily # Materialized view
WHERE
  time BETWEEN $__timeFrom() AND $__timeTo() # Time range from Grafana
ORDER BY
  time;
```

If you'd like to access the dashboard and explore the data yourself [click here](http://45.55.120.202/d/0s46279Sk/blockchain-stats?orgId=1).
