import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { expressDeployment, apiUrl } from "./src/docker/express-app";
import { timescaleIp } from "./src/timescale";
import { grafanaIp } from "./src/grafana";

export const dataClusterConfig = dataCluster;
export const expressApiUrl = apiUrl;
export { grafanaIp, timescaleIp };
