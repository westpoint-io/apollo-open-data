import * as digitalocean from "@pulumi/digitalocean";
import * as dotenv from "dotenv";
import * as k8s from "@pulumi/kubernetes";

import { digitalOceanProvider } from "../../providers/digitalocean";

// Load environment variables from .env file
dotenv.config();

// Increase the node count and use a larger instance size
export const bitcoinCluster = new digitalocean.KubernetesCluster(
    "bitcoin-cluster",
    {
        region: digitalocean.Region.NYC3,
        version: '1.30.4-do.0',
        nodePool: {
            name: "bitcoin-pool",
            size: digitalocean.DropletSlug.DropletS4VCPU8GB, // Keep the original size
            nodeCount: 1,
        },
    },
    { provider: digitalOceanProvider }
);


export const k8sProvider = new k8s.Provider("k8s-provider-bitcoin", {
    kubeconfig: bitcoinCluster.kubeConfigs[0].rawConfig,
    enableServerSideApply: true,
});
