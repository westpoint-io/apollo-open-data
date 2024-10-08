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

export const rawBtcBlocks = new digitalocean.DatabaseKafkaTopic(
  "raw-btc-blocks",
  {
    clusterId: kafkaCluster.id,
    name: "raw-btc-blocks",
    partitionCount: 3,
    replicationFactor: 2,
    configs: [
      {
        cleanupPolicy: "delete",
        retentionBytes: "1073741824", // 1024 MB per partition
        deleteRetentionMs: "86400000", // Keep deleted tombstones for 1 day
      },
    ],
  }
);

export const rawBtcTransactions = new digitalocean.DatabaseKafkaTopic(
  "raw-btc-transactions",
  {
    clusterId: kafkaCluster.id,
    name: "raw-btc-transactions",
    partitionCount: 3,
    replicationFactor: 2,
    configs: [
      {
        cleanupPolicy: "delete",
        retentionBytes: "10737418240",
        deleteRetentionMs: "86400000",
        maxMessageBytes: "10485760", // 10MB max message size
      },
    ],
  }
);

export const rawBtcTransactionsBackfill = new digitalocean.DatabaseKafkaTopic(
  "raw-btc-transactions-backfill",
  {
    clusterId: kafkaCluster.id,
    name: "raw-btc-transactions-backfill",
    partitionCount: 3,
    replicationFactor: 2,
    configs: [
      {
        cleanupPolicy: "delete",
        retentionBytes: "1073741824",
        deleteRetentionMs: "86400000",
        maxMessageBytes: "10485760", // 10MB max message size
      },
    ],
  }
);

export const rawPriceBtcusdBinance = new digitalocean.DatabaseKafkaTopic(
  "raw-price-btcusd-binance",
  {
    clusterId: kafkaCluster.id,
    name: "raw-price-btcusd-binance",
    partitionCount: 3,
    replicationFactor: 2,
    configs: [
      {
        cleanupPolicy: "delete",
        retentionBytes: "104857600",
        deleteRetentionMs: "86400000",
      },
    ],
  }
);

export const rawTickerBtcusdBinance = new digitalocean.DatabaseKafkaTopic(
  "raw-ticker-btcusd-binance",
  {
    clusterId: kafkaCluster.id,
    name: "raw-ticker-btcusd-binance",
    partitionCount: 3,
    replicationFactor: 2,
    configs: [
      {
        cleanupPolicy: "delete",
        retentionBytes: "104857600",
        deleteRetentionMs: "86400000",
      },
    ],
  }
);
