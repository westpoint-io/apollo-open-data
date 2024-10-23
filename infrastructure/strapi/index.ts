import * as digitalocean from "@pulumi/digitalocean";
import { generateResourceId } from "../utils/index";

const APP_URL = process.env.APP_URL;

if (!APP_URL) throw new Error("App url not set");

export const postgresCluster = new digitalocean.DatabaseCluster(
  generateResourceId("postgres-cluster"),
  {
    name: generateResourceId("postgres-cluster"),
    engine: "pg",
    version: "15",
    size: digitalocean.DatabaseSlug.DB_1VPCU1GB,
    region: digitalocean.Region.NYC1,
    nodeCount: 1,
  },
);

export const postgresDb = new digitalocean.DatabaseDb(
  generateResourceId("strapi"),
  {
    clusterId: postgresCluster.id,
    name: generateResourceId("strapi"),
  },
);

export const strapiStorage = new digitalocean.SpacesBucket(
  generateResourceId("strapi-storage"),
  {
    name: generateResourceId("strapi-storage"),
    region: digitalocean.Region.NYC3,
  },
);

new digitalocean.SpacesBucketCorsConfiguration(
  generateResourceId("strapi-storage-cors"),
  {
    bucket: strapiStorage.id,
    region: digitalocean.Region.NYC3,
    corsRules: [
      {
        allowedHeaders: ["*"],
        allowedMethods: ["GET"],
        allowedOrigins: [APP_URL],
        maxAgeSeconds: 3000,
      },
    ],
  },
);
