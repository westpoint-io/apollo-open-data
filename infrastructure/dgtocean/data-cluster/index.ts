import { timescaleIp } from "./src/timescale";
import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { mageUrl } from "./src/mage/mage";
import { rawBtcTransactions } from "./src/kubernetes/kafka";
import { grafanaIp } from "./src/grafana";

import { rpcDeployment } from "./src/rpc";

// Export of platform clusters
export const dataClusterConfig = dataCluster;
export const bitcoinTopicId = rawBtcTransactions.id;

export const rpcDeploymentStatus = rpcDeployment.status;

export const rawbitcoinClusterId = rawBtcTransactions.clusterId;
export { grafanaIp, timescaleIp, mageUrl };
