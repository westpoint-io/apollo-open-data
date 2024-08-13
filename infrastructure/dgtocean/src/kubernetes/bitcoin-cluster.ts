import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { digitalOceanProvider } from "../providers/digitalocean";
import * as fs from "fs";
import * as path from "path";
import * as docker from "@pulumi/docker";
import * as dotenv from "dotenv";


// Load environment variables from .env file
dotenv.config();

export const bitcoinCluster = new digitalocean.KubernetesCluster(
    "bitcoin-cluster",
    {
        region: digitalocean.Region.NYC3,
        version: "1.30.2-do.0",
        nodePool: {
            name: "bitcoin-pool",
            size: digitalocean.DropletSlug.DropletS4VCPU8GB,
            nodeCount: 1,
        },
    },
    { provider: digitalOceanProvider }
);

export const bitcoinVolume = new digitalocean.Volume("bitcoin-volume", {
    region: digitalocean.Region.NYC3,
    size: 100,
    name: "bitcoin-data",
}, { provider: digitalOceanProvider });

const k8sProvider = new k8s.Provider("k8s-provider-bitcoin", {
    kubeconfig: bitcoinCluster.kubeConfigs[0].rawConfig,
});

// Create a namespace for Bitcoin
const bitcoinNamespace = new k8s.core.v1.Namespace(
    "bitcoin-namespace",
    {
        metadata: { name: "bitcoin" },
    },
    { provider: k8sProvider }
);

// Get the current stack name
const stack = pulumi.getStack();

// Create a new Docker image with a fully qualified name
const bitcoinImage = new docker.Image("bitcoin-image", {
    build: {
        context: path.join(__dirname, "../docker/bitcoin"),
        dockerfile: path.join(__dirname, "../docker/bitcoin/Dockerfile"),
        platform: "linux/amd64", // Specify the platform explicitly
    },
    imageName: `docker.io/jhonas8/custom-bitcoin:${stack}`,
    registry: {
        server: "docker.io",
        username: pulumi.secret(process.env.DOCKER_USERNAME as string),
        password: pulumi.secret(process.env.DOCKER_PASSWORD as string),
    },
});

// Deploy Bitcoin node using a Deployment
const bitcoinDeployment = new k8s.apps.v1.Deployment(
    "bitcoin-deployment",
    {
        metadata: {
            name: "bitcoin-node",
            namespace: bitcoinNamespace.metadata.name,
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: { app: "bitcoin" },
            },
            template: {
                metadata: { labels: { app: "bitcoin" } },
                spec: {
                    containers: [
                        {
                            name: "bitcoind",
                            image: bitcoinImage.imageName,
                            imagePullPolicy: "Always",
                            ports: [
                                { name: "rpc", containerPort: 8332 },
                                { name: "p2p", containerPort: 8333 },
                            ],
                            volumeMounts: [
                                {
                                    name: "bitcoin-data",
                                    mountPath: "/home/bitcoin/.bitcoin",
                                },
                                {
                                    name: "python-script",
                                    mountPath: "/home/bitcoin/.bitcoin/post_messages.py",
                                    subPath: "post_messages.py",
                                },
                            ],
                            resources: {
                                requests: {
                                    memory: "4Gi",
                                    cpu: "1",
                                },
                                limits: {
                                    memory: "8Gi",
                                    cpu: "2",
                                },
                            },
                            env: [
                                { name: "KAFKA_BOOTSTRAP_SERVERS", value: process.env.KAFKA_BOOTSTRAP_SERVERS },
                                { name: "KAFKA_TOPIC", value: process.env.KAFKA_TOPIC },
                                { name: "KAFKA_USERNAME", value: process.env.KAFKA_USERNAME },
                                { name: "KAFKA_PASSWORD", value: process.env.KAFKA_PASSWORD },
                            ],
                        },
                    ],
                    volumes: [
                        {
                            name: "bitcoin-data",
                            persistentVolumeClaim: {
                                claimName: "bitcoin-data-pvc",
                            },
                        },
                        {
                            name: "python-script",
                            configMap: {
                                name: "python-script-configmap",
                            },
                        },
                    ],
                },
            },
        },
    },
    { provider: k8sProvider }
);

// Create a PersistentVolumeClaim for Bitcoin data
const bitcoinPVC = new k8s.core.v1.PersistentVolumeClaim(
    "bitcoin-pvc",
    {
        metadata: {
            name: "bitcoin-data-pvc",
            namespace: bitcoinNamespace.metadata.name,
        },
        spec: {
            accessModes: ["ReadWriteOnce"],
            storageClassName: "do-block-storage",
            resources: {
                requests: { storage: "100Gi" },
            },
        },
    },
    { provider: k8sProvider }
);

// Modify the Bitcoin service to expose the P2P port
export const bitcoinService = new k8s.core.v1.Service(
    "bitcoin-service",
    {
        metadata: {
            name: "bitcoin-service",
            namespace: bitcoinNamespace.metadata.name,
        },
        spec: {
            type: "LoadBalancer",
            selector: { app: "bitcoin" },
            ports: [
                { name: "rpc", port: 8332, targetPort: 8332 },
                { name: "p2p", port: 8333, targetPort: 8333 },
            ],
        },
    },
    { provider: k8sProvider }
);

// Export the service name instead of trying to access the IP directly
export const bitcoinServiceName = bitcoinService.metadata.name;

export const kubeconfig = pulumi.secret(bitcoinCluster.kubeConfigs[0].rawConfig);

export const volumeId = bitcoinVolume.id;

export const bitcoinDeploymentStatus = bitcoinDeployment.status;
export const bitcoinDeploymentSpec = bitcoinDeployment.spec;

// Read the Python script file
const pythonScriptPath = path.join(__dirname, "../docker/bitcoin/post_messages.py");
const pythonScriptContent = fs.readFileSync(pythonScriptPath, "utf8");

// Create a ConfigMap for the Python script
const pythonScriptConfigMap = new k8s.core.v1.ConfigMap(
    "python-script-configmap",
    {
        metadata: {
            name: "python-script-configmap",
            namespace: bitcoinNamespace.metadata.name,
        },
        data: {
            "post_messages.py": pythonScriptContent,
        },
    },
    { provider: k8sProvider }
);
