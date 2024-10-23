import * as dotenv from "dotenv";
import { kubeconfig as dataCluster } from "./src/kubernetes/data-cluster";
import { timescaleIp } from "./src/timescale";
import { grafanaIp } from "./src/grafana";
import { setupDNSAndCertificate } from "./src/dns";

dotenv.config();

export = async () => {
  const domainName = process.env.DOMAIN_NAME;
  const resourceId = process.env.DOMAIN_RESOURCE_ID;

  let dnsResources: any | undefined;

  if (domainName) {
    const grafanaLbIp = process.env.GRAFANA_LB_IP;
    if (!grafanaLbIp) {
      console.error("GRAFANA_LB_IP is not set in .env file");
      return {};
    }

    const { domain, dashboardRecord, certificate, grafanaService } =
      await setupDNSAndCertificate(domainName, grafanaLbIp, resourceId);

    // Set DNS-related resources
    dnsResources = {
      domain,
      dashboardRecord,
      certificate,
      grafanaService,
    };
  }

  // Return all exports
  return {
    dataClusterConfig: dataCluster,
    grafanaIp,
    timescaleIp,
    dnsResources,
  };
};
