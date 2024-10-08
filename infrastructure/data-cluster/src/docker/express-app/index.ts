import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import * as path from "path";
import * as dotenv from "dotenv";
import { k8sProvider } from "../../kubernetes/data-cluster";

dotenv.config();

const appName = "express-ws";
const appLabels = { app: appName };

const port = 4000;
const stack = pulumi.getStack();

const expressImage = new docker.Image(appName, {
  build: {
    context: path.join(__dirname, "../express-app/"),
    dockerfile: path.join(__dirname, "Dockerfile"),
    platform: "linux/amd64",
  },
  imageName: `docker.io/${process.env.DOCKER_USERNAME}/${appName}:${stack}`,
  registry: {
    server: "docker.io",
    username: process.env.DOCKER_USERNAME,
    password: process.env.DOCKER_PASSWORD,
  },
});

export const expressDeployment = new k8s.apps.v1.Deployment(
  appName,
  {
    metadata: {
      name: appName,
    },
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 1,
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: appName,
              image: expressImage.imageName,
              imagePullPolicy: "Always",
              ports: [{ containerPort: 4000 }],
              env: [
                { name: "DB_USER", value: process.env.DB_USER },
                { name: "DB_PASSWORD", value: process.env.DB_PASSWORD },
                { name: "DB_HOST", value: process.env.DB_HOST },
                { name: "DB_NAME", value: process.env.DB_NAME },
                { name: "DB_TABLE", value: process.env.DB_TABLE },
              ],
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider, dependsOn: [expressImage] },
);

const service = new k8s.core.v1.Service(
  appName,
  {
    spec: {
      type: "LoadBalancer",
      selector: appLabels,
      ports: [{ port: 80, targetPort: port }],
    },
  },
  { provider: k8sProvider },
);

// Export the Service's IP address
export const apiUrl = service.status.loadBalancer.ingress[0].apply((ingress) =>
  ingress.hostname
    ? `http://${ingress.hostname}:${port}`
    : `http://${ingress.ip}:${port}`,
);
