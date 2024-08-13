import * as digitalocean from "@pulumi/digitalocean";
import { digitalOceanProvider } from "../providers/digitalocean";

export const kafkaCluster = new digitalocean.DatabaseCluster(
  "kafka",
  {
    name: "kafka-cluster",
    engine: "kafka",
    version: "3.7",
    size: "db-s-2vcpu-2gb",
    region: digitalocean.Region.NYC3,
    nodeCount: 3,
    tags: ["production"],
  },
  { provider: digitalOceanProvider }
);

export const rawPriceBtcusdBinance = new digitalocean.DatabaseKafkaTopic(
  "raw-price-btcusd-binance",
  {
    clusterId: kafkaCluster.id,
    name: "raw-price-btcusd-binance",
    partitionCount: 3,
    replicationFactor: 2,
  }
);

export const rawTickerBtcusdBinance = new digitalocean.DatabaseKafkaTopic(
  "raw-ticker-btcusd-binance",
  {
    clusterId: kafkaCluster.id,
    name: "raw-ticker-btcusd-binance",
    partitionCount: 3,
    replicationFactor: 2,
  }
);

export const rawBtcBlocks = new digitalocean.DatabaseKafkaTopic(
  "raw-btc-blocks",
  {
    clusterId: kafkaCluster.id,
    name: "raw-btc-blocks",
    partitionCount: 3,
    replicationFactor: 2,
  }
);

export const rawBtcTransactions = new digitalocean.DatabaseKafkaTopic(
  "raw-btc-transactions",
  {
    clusterId: kafkaCluster.id,
    name: "raw-btc-transactions",
    partitionCount: 3,
    replicationFactor: 2,
  }
);
