import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as path from "path";

import { k8sProvider } from "../kubernetes/data-cluster";

import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const rpcNamespace = new k8s.core.v1.Namespace(
  "rpc-namespace",
  {
    metadata: { name: "rpc" },
  },
  { provider: k8sProvider }
);

const stack = pulumi.getStack();

const rpcImage = new docker.Image("rpc-image", {
  build: {
    context: path.join(__dirname, "../docker/rpc"),
    dockerfile: path.join(__dirname, "../docker/rpc/Dockerfile"),
    platform: "linux/amd64",
  },
  imageName: `docker.io/${process.env.DOCKER_USERNAME}/custom-rpc:${stack}`,
  registry: {
    server: "docker.io",
    username: pulumi.secret(process.env.DOCKER_USERNAME as string),
    password: pulumi.secret(process.env.DOCKER_PASSWORD as string),
  },
});

export const rpcDeployment = new k8s.apps.v1.Deployment(
  "rpc-deployment",
  {
    metadata: {
      name: "rpc-deployment",
      namespace: rpcNamespace.metadata.name,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: { app: "rpc" },
      },
      template: {
        metadata: { labels: { app: "rpc" } },
        spec: {
          containers: [
            {
              name: "rpc",
              image: rpcImage.imageName,
              imagePullPolicy: "Always",
              ports: [{ containerPort: 6789 }],
              env: [
                {
                  name: "KAFKA_BOOTSTRAP_SERVERS",
                  value: process.env.KAFKA_BOOTSTRAP_SERVERS,
                },
                { name: "KAFKA_TOPIC", value: process.env.KAFKA_TOPIC },
                { name: "KAFKA_USERNAME", value: process.env.KAFKA_USERNAME },
                { name: "KAFKA_PASSWORD", value: process.env.KAFKA_PASSWORD },
                {
                  name: "BINANCE_API_SECRET",
                  value: process.env.BINANCE_API_SECRET,
                },
                { name: "BINANCE_API_KEY", value: process.env.BINANCE_API_KEY },
                { name: "DOCKER_USERNAME", value: process.env.DOCKER_USERNAME },
                { name: "DOCKER_PASSWORD", value: process.env.DOCKER_PASSWORD },
                { name: "RPC_USER", value: process.env.RPC_USER },
                { name: "RPC_PASSWORD", value: process.env.RPC_PASSWORD },
                { name: "RPC_HOST", value: process.env.RPC_HOST },
                { name: "RPC_PORT", value: process.env.RPC_PORT },
                {
                  name: "SLACK_NOTIFICATION_WEBHOOK_ENDPOINT",
                  value: process.env.SLACK_NOTIFICATION_WEBHOOK_ENDPOINT,
                },
              ],
              resources: {
                requests: {
                  memory: "5Gi",
                  cpu: "2",
                },
                limits: {
                  memory: "8Gi",
                  cpu: "3",
                },
              },
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider }
);
