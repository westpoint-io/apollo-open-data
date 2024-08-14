import { timescaleIp } from "./src/timescale";
import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { mageNamespace } from "./src/mage/mage";
import { rawBtcBlocks } from "./src/kubernetes/kafka";
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

// Export of bitcoin cluster
export const clusterName = bitcoinCluster.name;
export const volumeName = bitcoinVolume.name;
export const bitcoinDeploymentState = bitcoinDeploymentStatus;
export const bitcoinDeploymentConfiguration = bitcoinDeploymentSpec;
export const bitcoinServiceLoadBalancerIP =
  bitcoinService.status.loadBalancer.ingress[0].ip;
export const bitcoinKubeconfig = kubeconfig;

export { grafanaIp, timescaleIp };

// ... other exports as needed ...
