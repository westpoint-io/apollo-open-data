import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { digitalOceanProvider } from "../providers/digitalocean";

export const combinedCluster = new digitalocean.KubernetesCluster(
  "data-cluster",
  {
    region: digitalocean.Region.NYC3,
    version: "1.31.1-do.0",
    nodePool: {
      name: "data-pool",
      size: digitalocean.DropletSlug.DropletS4VCPU8GB,
      nodeCount: 2,
    },
  },
  { provider: digitalOceanProvider }
);

export const k8sProvider = new k8s.Provider("k8s-provider", {
  kubeconfig: combinedCluster.kubeConfigs[0].rawConfig,
});

export const kubeconfig = combinedCluster.kubeConfigs[0].rawConfig;
