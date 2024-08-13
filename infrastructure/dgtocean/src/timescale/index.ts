import * as k8s from "@pulumi/kubernetes";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { k8sProvider } from "../kubernetes/data-cluster";

const namespace = new k8s.core.v1.Namespace(
  "stackgres-namespace",
  {
    metadata: {
      name: "stackgres",
    },
  },
  { provider: k8sProvider }
);

const localYamlFilePath = path.join(__dirname, "stackgres-operator.yml");

const stackgresOperator = new k8s.yaml.ConfigFile(
  "stackgres-operator",
  {
    file: localYamlFilePath,
    transformations: [
      (obj: any) => {
        // Modify other resources to use the existing namespace
        if (obj.metadata) {
          obj.metadata.namespace = namespace.metadata.name;
        }
        return obj;
      },
    ],
  },
  {
    provider: k8sProvider,
    dependsOn: [namespace],
  }
);

const storageClass = new k8s.storage.v1.StorageClass(
  "timescale-storageclass",
  {
    metadata: {
      name: "timescale-storageclass",
    },
    provisioner: "dobs.csi.digitalocean.com",
    allowVolumeExpansion: true,
    parameters: {
      type: "gp2",
    },
  },
  { provider: k8sProvider }
);

const pvc = new k8s.core.v1.PersistentVolumeClaim(
  "timescaledb-storage",
  {
    metadata: {
      name: "timescaledb-storage",
      namespace: namespace.metadata.name,
    },
    spec: {
      accessModes: ["ReadWriteOnce"],
      resources: {
        requests: {
          storage: "50Gi", // Initial size
        },
      },
      storageClassName: storageClass.metadata.name,
    },
  },
  { provider: k8sProvider }
);

const dbPasswordSecret = new k8s.core.v1.Secret(
  "db-password-secret",
  {
    metadata: {
      namespace: namespace.metadata.name,
      name: "timescaledb-password",
    },
    stringData: {
      password: String(process.env.PG_PASSWORD),
    },
  },
  { provider: k8sProvider }
);

const timescaleDBStatefulSet = new k8s.apps.v1.StatefulSet(
  "timescale-db",
  {
    metadata: {
      namespace: namespace.metadata.name,
      name: "timescaledb",
    },
    spec: {
      selector: {
        matchLabels: {
          app: "timescaledb",
        },
      },
      serviceName: "timescaledb",
      replicas: 1,
      template: {
        metadata: {
          labels: {
            app: "timescaledb",
          },
        },
        spec: {
          initContainers: [
            {
              name: "init-chown-data",
              image: "alpine",
              command: [
                "sh",
                "-c",
                "addgroup -S postgres && adduser -S postgres -G postgres && mkdir -p /var/lib/postgresql/data/pgdata && chown -R postgres:postgres /var/lib/postgresql/data/pgdata && chmod -R 700 /var/lib/postgresql/data/pgdata",
              ],
              volumeMounts: [
                {
                  name: "timescaledb-storage",
                  mountPath: "/var/lib/postgresql/data",
                },
              ],
            },
          ],
          containers: [
            {
              name: "timescaledb",
              image: "timescale/timescaledb:latest-pg16",
              ports: [
                {
                  containerPort: 5432,
                  name: "postgres",
                },
              ],
              env: [
                {
                  name: "POSTGRES_PASSWORD",
                  valueFrom: {
                    secretKeyRef: {
                      name: "timescaledb-password",
                      key: "password",
                    },
                  },
                },
                {
                  name: "PGDATA",
                  value: "/var/lib/postgresql/data/pgdata", // Set PGDATA to the subdirectory
                },
              ],
              volumeMounts: [
                {
                  name: "timescaledb-storage",
                  mountPath: "/var/lib/postgresql/data",
                },
              ],
            },
          ],
          volumes: [
            {
              name: "timescaledb-storage",
              persistentVolumeClaim: {
                claimName: pvc.metadata.name,
              },
            },
          ],
        },
      },
    },
  },
  {
    provider: k8sProvider,
    dependsOn: [namespace, stackgresOperator, dbPasswordSecret],
  }
);

const timescaleDBService = new k8s.core.v1.Service(
  "timescale-db-service",
  {
    metadata: {
      namespace: namespace.metadata.name,
      name: "timescaledb",
    },
    spec: {
      type: "LoadBalancer",
      selector: {
        app: "timescaledb",
      },
      ports: [
        {
          port: 5432,
          targetPort: 5432,
          protocol: "TCP",
        },
      ],
    },
  },
  { provider: k8sProvider, dependsOn: [timescaleDBStatefulSet] }
);

export const timescaleIp =
  timescaleDBService.status.loadBalancer.ingress[0].apply((ingress) =>
    ingress.hostname ? `${ingress.hostname}` : `${ingress.ip}`
  );
