import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as digitalocean from "@pulumi/digitalocean";
import * as path from "path";
import * as dotenv from "dotenv";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesConfig } from "../../helpers/kubernetes/index";
import { getCredentials } from "../../helpers/docker/index";
import { existingDomain } from "../../../generated_dns";
import { digitalOceanProvider } from "../../providers/digitalocean";
dotenv.config();

const appName = "express-ws";
const appLabels = { app: appName };
const port = 4000;
const stack = pulumi.getStack();

export const { k8sProvider, kubeconfig } =
  getKubernetesConfig("express-provider");

const containerRegistry = new digitalocean.ContainerRegistry(
  `${stack}_container_registry`,
  {
    name: `${stack}-container-registry`,
    subscriptionTierSlug: "starter",
  },
);

const credentials = new digitalocean.ContainerRegistryDockerCredentials(
  `${stack}_credentials`,
  {
    registryName: containerRegistry.name,
    write: true,
  },
);

const registryInfo = pulumi
  .all([credentials.dockerCredentials, containerRegistry.serverUrl])
  .apply(([authJson, serverUrl]) =>
    getCredentials({ credentials: authJson, serverUrl }),
  );

const dockerImage = new docker.Image(appName, {
  build: {
    context: path.join(__dirname, "../express-app/"),
    dockerfile: path.join(__dirname, "Dockerfile"),
    platform: "linux/amd64",
  },
  imageName: containerRegistry.endpoint.apply(
    (s) => `${s}/${appName}:${stack}`,
  ),
  registry: registryInfo,
});

const kubernetesSecret = new k8s.core.v1.Secret(
  `${stack}-kube-secret`,
  {
    metadata: {
      name: `${stack}-kube-secret`,
      namespace: "default",
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
      ".dockerconfigjson": credentials.dockerCredentials,
    },
  },
  { provider: k8sProvider },
);

export const kubernetesDeployment = new k8s.apps.v1.Deployment(
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
              image: dockerImage.imageName,
              imagePullPolicy: "Always",
              ports: [{ containerPort: port }],
              env: [
                { name: "DB_USER", value: process.env.DB_USER },
                { name: "DB_PASSWORD", value: process.env.DB_PASSWORD },
                { name: "DB_HOST", value: process.env.DB_HOST },
                { name: "DB_NAME", value: process.env.DB_NAME },
                { name: "DB_TABLE", value: process.env.DB_TABLE },
                {
                  name: "BTC_USD_TICKER_PRICE_TABLE_NAME",
                  value: process.env.BTC_USD_TICKER_PRICE_TABLE_NAME,
                },
                {
                  name: "BTC_BLOCKS_FIVE_MIN_TABLE_NAME",
                  value: process.env.BTC_BLOCKS_FIVE_MIN_TABLE_NAME,
                },
                {
                  name: "BTC_BLOCKS_TABLE_NAME",
                  value: process.env.BTC_BLOCKS_TABLE_NAME,
                },
              ],
            },
          ],
          imagePullSecrets: [{ name: kubernetesSecret.metadata.name }],
        },
      },
    },
  },
  { provider: k8sProvider, dependsOn: [dockerImage] },
);

// Create a Let's Encrypt certificate for the Express app
const certificateName = `express-cert-${existingDomain.name.apply(name => name.replace('.', '-'))}`;
const certificate = new digitalocean.Certificate(certificateName, {
  name: certificateName,
  type: "lets_encrypt",
  domains: [existingDomain.name.apply(name => `api.${name}`)],
}, { provider: digitalOceanProvider });

// Update the Kubernetes Service to use HTTPS and automatic SSL certificate
export const service = new k8s.core.v1.Service(
  appName,
  {
    metadata: {
      name: appName,
      annotations: {
        "service.beta.kubernetes.io/do-loadbalancer-protocol": "https",
        "service.beta.kubernetes.io/do-loadbalancer-tls-ports": "443",
        "service.beta.kubernetes.io/do-loadbalancer-certificate-id": certificate.id,
        "service.beta.kubernetes.io/do-loadbalancer-redirect-http-to-https": "true",
        "service.beta.kubernetes.io/do-loadbalancer-hostname": existingDomain.name.apply(name => `api.${name}`),
      },
    },
    spec: {
      type: "LoadBalancer",
      selector: appLabels,
      ports: [
        { name: "https", port: 443, targetPort: port },
      ],
    },
  },
  { provider: k8sProvider }
);

// Create an A record for api.xstream.fi
const apiRecord = new digitalocean.DnsRecord("expressApiRecord", {
  domain: existingDomain.name,
  type: "A",
  name: "api",
  value: service.status.loadBalancer.ingress[0].ip,
}, { provider: digitalOceanProvider });

// Export the Service's IP address and HTTPS URL
export const apiIp = service.status.loadBalancer.ingress[0].ip;
export const apiUrl = pulumi.interpolate`https://api.${existingDomain.name}`;
