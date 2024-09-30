import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { timescaleIp } from "./src/timescale";
import { grafanaIp } from "./src/grafana";
// import { mageUrl } from "./src/mage/mage";
// import { rawBtcTransactions } from "./src/kubernetes/kafka";
// import { rpcDeployment } from "./src/rpc";

// Export of platform clusters
// export const bitcoinTopicId = rawBtcTransactions.id;
// export const rpcDeploymentStatus = rpcDeployment.status;
// export const rawbitcoinClusterId = rawBtcTransactions.clusterId;

export const dataClusterConfig = dataCluster;
export { grafanaIp, timescaleIp };
