import { timescaleIp } from "./src/timescale";
import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { mageServiceUrl } from "./src/mage/mage";
import { rawDataBitcoinTopic } from "./src/kubernetes/kafka";
import { grafanaIp } from "./src/grafana";

import {
  bitcoinCluster,
  bitcoinVolume,
  bitcoinDeploymentStatus,
  bitcoinDeploymentSpec,
  bitcoinService,
  kubeconfig,
} from "./src/kubernetes/bitcoin-cluster";

// Export of platform clusters
export const dataClusterConfig = dataCluster;
export const mageServiceUrlOutput = mageServiceUrl;
export const bitcoinTopicId = rawDataBitcoinTopic.id;

// Export of bitcoin cluster
export const clusterName = bitcoinCluster.name;
export const volumeName = bitcoinVolume.name;
export const bitcoinDeploymentState = bitcoinDeploymentStatus;
export const bitcoinDeploymentConfiguration = bitcoinDeploymentSpec;
export const bitcoinServiceLoadBalancerIP =
  bitcoinService.status.loadBalancer.ingress[0].ip;
export const bitcoinKubeconfig = kubeconfig;

export const rawbitcoinClusterId = rawDataBitcoinTopic.clusterId;

export { grafanaIp, timescaleIp };

// ... other exports as needed ...
