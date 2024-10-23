import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as path from "path";
import { k8sProvider } from "../kubernetes/data-cluster";
import { sanitizeDashboardName } from "./utils/sanitizeDashboardName";
import { datasources } from "./datasources";
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

// Create ConfigMaps for dashboards
const dashboardsDir = path.join(__dirname, "dashboards");
const dashboardFiles = fs.readdirSync(dashboardsDir);

const dashboardConfigMaps = dashboardFiles.map((file) => {
  const dashboardName = path.parse(file).name;
  const sanitizedDashboardName = sanitizeDashboardName(dashboardName);
  const dashboardContent = fs.readFileSync(path.join(dashboardsDir, file), "utf8");

  return new k8s.core.v1.ConfigMap(`grafana-dashboard-${sanitizedDashboardName}`, {
    metadata: {
      name: `grafana-dashboard-${sanitizedDashboardName}`,
      namespace: namespace.metadata.name,
      labels: {
        grafana_dashboard: "1"
      }
    },
    data: {
      [`${sanitizedDashboardName}.json`]: dashboardContent,
    },
  }, { provider: k8sProvider });
});

const dashboardConfigMapsNames = dashboardFiles.map((file) => `grafana-dashboard-${sanitizeDashboardName(path.parse(file).name)}`);

const grafana = new k8s.helm.v3.Chart(
  "grafana-helm",
  {
    chart: "grafana",
    version: "8.4.1",
    fetchOpts: {
      repo: "https://grafana.github.io/helm-charts",
    },
    values: {
      fullnameOverride: "grafana", // Ensure consistent naming
      persistence: {
        enabled: true,
        size: "10Gi",
      },
      adminPassword: String(process.env.GRAFANA_ADMIN_PASSWORD),
      service: {
        type: "LoadBalancer",
      },
      rbac: {
        pspEnabled: false,
      },
      testFramework: {
        enabled: false,
      },
      // Add sidecar configuration for dashboard auto-import
      sidecar: {
        dashboards: {
          enabled: true,
          label: "grafana_dashboard",
          folder: "/tmp/dashboards",
          provider: {
            foldersFromFilesStructure: true,
          },
          searchNamespace: "ALL",
        },
      },
      dashboardsConfigMaps: dashboardConfigMapsNames.reduce((acc, name) => {
        acc[name] = name;
        return acc;
      }, {} as Record<string, string>),
      datasources: {
        "datasources.yaml": {
          apiVersion: 1,
          datasources: datasources,
        },
      },
      "grafana.ini": {
        server: {
          root_url: "%(protocol)s://%(domain)s/",
        },
        "auth.anonymous": {
          enabled: true,
        },
        // Add this section to set the default dashboard
        dashboards: {
          default_home_dashboard_path: `/tmp/dashboards/${dashboardConfigMapsNames[0]}.json`
        },
      },
    },
    namespace: namespace.metadata.name,
  },
  {
    provider: k8sProvider,
    dependsOn: dashboardConfigMaps,
  }
);

// Get the load balancer IP
const grafanaService = grafana.getResource("v1/Service", "grafana/grafana");
export const grafanaIp = grafanaService.status.loadBalancer.ingress[0].apply(
  (ingress) => (ingress.hostname ? `${ingress.hostname}` : `${ingress.ip}`)
);
