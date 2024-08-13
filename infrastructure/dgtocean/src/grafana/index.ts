import * as k8s from "@pulumi/kubernetes";
import { k8sProvider } from "../kubernetes/data-cluster";

const podSecurityLabels = {
  "pod-security.kubernetes.io/enforce": "baseline",
  "pod-security.kubernetes.io/enforce-version": "v1.25",
  "pod-security.kubernetes.io/audit": "baseline",
  "pod-security.kubernetes.io/warn": "baseline",
};

const namespace = new k8s.core.v1.Namespace(
  "grafana-namespace",
  {
    metadata: {
      name: "grafana",
      labels: podSecurityLabels,
    },
  },
  { provider: k8sProvider }
);

const grafana = new k8s.helm.v3.Chart(
  "grafana",
  {
    chart: "grafana",
    version: "8.4.1", // grafana 11.1.3
    fetchOpts: {
      repo: "https://grafana.github.io/helm-charts",
    },
    values: {
      persistence: {
        enabled: true,
        size: "10Gi",
      },
      adminPassword: String(process.env.GRAFANA_ADMIN_PASSWORD),
      service: {
        type: "LoadBalancer",
      },
      rbac: {
        pspEnabled: false, // Disable PodSecurityPolicy
      },
      testFramework: {
        enabled: false, // Disable test framework
      },
    },
    namespace: namespace.metadata.name,
  },
  { provider: k8sProvider }
);

// Get the load balancer IP
const grafanaService = grafana.getResource("v1/Service", "grafana/grafana");
export const grafanaIp = grafanaService.status.loadBalancer.ingress[0].apply(
  (ingress) => (ingress.hostname ? `${ingress.hostname}` : `${ingress.ip}`)
);
