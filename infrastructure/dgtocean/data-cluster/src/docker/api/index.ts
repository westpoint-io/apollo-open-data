import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import * as path from "path";

import { k8sProvider } from "../../kubernetes/data-cluster";

const appName = "apoll-api";
const appLabels = { app: appName };

const stack = pulumi.getStack();

const image = new docker.Image(appName, {
  build: {
    context: path.join(__dirname, "../../../../../api"),
    dockerfile: path.join(__dirname, "Dockerfile"),
    platform: "linux/amd64",
  },
  imageName: `docker.io/mattanciloto/${appName}:${stack}`,
});

const imageNameWithDigest = pulumi
  .all([image.imageName, image.repoDigest])
  .apply(([name, digest]) => `${name}@${digest}`);

const deployment = new k8s.apps.v1.Deployment(
  appName,
  {
    metadata: {
      annotations: {
        imageDigest: imageNameWithDigest,
      },
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
              image: image.imageName,
              imagePullPolicy: "Always",
              ports: [{ containerPort: 3000 }],
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider, dependsOn: [image] }
);

// Define the Kubernetes Service
const service = new k8s.core.v1.Service(
  appName,
  {
    spec: {
      type: "LoadBalancer",
      selector: appLabels,
      ports: [{ port: 80, targetPort: 3000 }],
    },
  },
  { provider: k8sProvider }
);

// Export the Service's IP address
export const apiUrl = service.status.loadBalancer.ingress[0].apply((ingress) =>
  ingress.hostname
    ? `http://${ingress.hostname}:3000`
    : `http://${ingress.ip}:3000`
);
