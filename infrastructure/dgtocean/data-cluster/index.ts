import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { timescaleIp } from "./src/timescale";
import { grafanaIp } from "./src/grafana";

// Export of platform clusters
export const dataClusterConfig = dataCluster;
export { grafanaIp, timescaleIp };
