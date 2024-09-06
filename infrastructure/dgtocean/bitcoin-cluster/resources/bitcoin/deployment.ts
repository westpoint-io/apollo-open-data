import * as k8s from "@pulumi/kubernetes";

import { bitcoinNamespace } from "./namespace";
import { bitcoinPVC } from "./volume";
import { bitcoinImage } from "./image";
import { k8sProvider } from "./cluster";

export const bitcoinDeployment = new k8s.apps.v1.Deployment(
    "bitcoin-deployment",
    {
        metadata: {
            name: "bitcoin-node",
            namespace: bitcoinNamespace.metadata.name,
            labels: { app: "bitcoin" },
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
                                    cpu: "1", // Request 0.5 CPU cores
                                    memory: "1Gi", // Request 1 GB of memory
                                },
                                limits: {
                                    cpu: "3", // Adjust CPU limit
                                    memory: "6Gi", // Keep memory limit
                                },
                            },
                            env: [
                                {
                                    name: "KAFKA_BOOTSTRAP_SERVERS",
                                    value: process.env.KAFKA_BOOTSTRAP_SERVERS,
                                },
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
                                claimName: bitcoinPVC.metadata.name,
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
    { provider: k8sProvider, dependsOn: [bitcoinPVC] }
);
