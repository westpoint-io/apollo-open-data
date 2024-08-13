import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

import { k8sProvider } from "../kubernetes/data-cluster";
import { digitalOceanProvider } from "../providers/digitalocean";

export const volume = new digitalocean.Volume(
  "mage-data-volume",
  {
    size: 10,
    region: digitalocean.Region.NYC3,
    description: "Persistent storage for Mage",
  },
  { provider: digitalOceanProvider }
);

export const mageNamespace = new k8s.core.v1.Namespace(
  "mage-namespace",
  {
    metadata: { name: "mage" },
  },
  { provider: k8sProvider }
);

const magePv = new k8s.core.v1.PersistentVolume(
  "mage-pv",
  {
    metadata: {
      name: "mage-pv",
    },
    spec: {
      capacity: {
        storage: "10Gi",
      },
      accessModes: ["ReadWriteMany"],
      persistentVolumeReclaimPolicy: "Retain",
      csi: {
        driver: "dobs.csi.digitalocean.com",
        volumeHandle: volume.id,
        fsType: "ext4",
      },
      claimRef: {
        namespace: mageNamespace.metadata.name,
        name: "mage-pvc",
      },
    },
  },
  { provider: k8sProvider }
);

const magePvc = new k8s.core.v1.PersistentVolumeClaim(
  "mage-pvc",
  {
    metadata: {
      name: "mage-pvc",
      namespace: mageNamespace.metadata.name,
    },
    spec: {
      accessModes: ["ReadWriteMany"],
      resources: {
        requests: {
          storage: "10Gi",
        },
      },
      volumeName: magePv.metadata.name,
    },
  },
  { provider: k8sProvider }
);

export const mageDeployment = new k8s.apps.v1.Deployment(
  "mage-deployment",
  {
    metadata: {
      name: "mage-deployment",
      namespace: mageNamespace.metadata.name,
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: { app: "mage" },
      },
      template: {
        metadata: { labels: { app: "mage" } },
        spec: {
          initContainers: [
            {
              name: "install-pyspark",
              image: "openjdk:11-slim",
              command: [
                "sh",
                "-c",
                "apt-get update && apt-get install -y python3-pip && pip3 install pyspark && cp -r /usr/local/lib/python3.9/dist-packages/pyspark /mage_data/pyspark && cp -r /usr/local/lib/python3.9/dist-packages/py4j /mage_data/py4j && cp -r /usr/local/openjdk-11 /mage_data/java && touch /mage_data/cafile.crt",
              ],
              volumeMounts: [
                {
                  name: "mage-data",
                  mountPath: "/mage_data",
                },
              ],
            },
          ],
          containers: [
            {
              name: "mage",
              image: "mageai/mageai:latest",
              ports: [{ containerPort: 6789 }],
              command: ["mage", "start", "/mage_data"],
              env: [
                { name: "MAGE_HOME", value: "/mage_data" },
                { name: "PYTHONPATH", value: "/mage_data" },
                { name: "JAVA_HOME", value: "/mage_data/java" },
                { name: "SSL_CERT_FILE", value: "/mage_data/cafile.pem" },
              ],
              volumeMounts: [
                {
                  name: "mage-data",
                  mountPath: "/mage_data",
                },
              ],
              resources: {
                requests: {
                  memory: "3Gi",
                  cpu: "1",
                },
                limits: {
                  memory: "4Gi",
                  cpu: "2500m",
                },
              },
            },
          ],
          volumes: [
            {
              name: "mage-data",
              persistentVolumeClaim: {
                claimName: magePvc.metadata.name,
              },
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider }
);

export const mageService = new k8s.core.v1.Service(
  "mage-service",
  {
    metadata: {
      name: "mage-service",
      namespace: mageNamespace.metadata.name,
    },
    spec: {
      type: "LoadBalancer",
      selector: { app: "mage" },
      ports: [{ port: 80, targetPort: 6789, nodePort: 30080 }],
    },
  },
  { provider: k8sProvider }
);

export const mageServiceUrl = mageService.status.loadBalancer.ingress[0].apply(
  (ingress) =>
    ingress.hostname ? `http://${ingress.hostname}` : `http://${ingress.ip}`
);