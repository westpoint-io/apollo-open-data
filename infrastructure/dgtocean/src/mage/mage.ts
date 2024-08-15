import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

import { pipelineDataToCreate } from "./pipelines";

import { k8sProvider } from "../kubernetes/data-cluster";
import { digitalOceanProvider } from "../providers/digitalocean";
const mageDeploy = async () => {
  const pipelineFiles = await pipelineDataToCreate();

  const files = JSON.stringify(pipelineFiles);

  const volume = new digitalocean.Volume(
    "mage-data-volume",
    {
      size: 10,
      region: digitalocean.Region.NYC3,
      description: "Persistent storage for Mage",
    },
    { provider: digitalOceanProvider }
  );

  const mageNamespace = new k8s.core.v1.Namespace(
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
        accessModes: ["ReadWriteOnce"],
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

  const mageDeployment = new k8s.apps.v1.Deployment(
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
        strategy: {
          type: "Recreate", // Only specify the 'Recreate' strategy, no rollingUpdate field
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
                  `
                  apt-get update && apt-get install -y python3-pip jq && pip3 install pyspark;
                  
                  # Copy necessary libraries to mage_data
                  cp -r /usr/local/lib/python3.9/dist-packages/pyspark /mage_data/pyspark;
                  cp -r /usr/local/lib/python3.9/dist-packages/py4j /mage_data/py4j;
                  cp -r /usr/local/openjdk-11 /mage_data/java;
                  touch /mage_data/cafile.crt;
                  
                  echo "Copy complete";
                  `,
                ],
                volumeMounts: [
                  {
                    name: "mage-data",
                    mountPath: "/mage_data",
                  },
                ],
              },
              {
                name: "create-pipeline-files",
                image: "alpine:3.14",
                command: ["/bin/sh", "-c"],
                args: [
                  `
                  set -e
                  echo "Installing jq..."
                  apk add --no-cache jq

                  echo "Creating pipeline files and folders..."
                  echo "$PIPELINE_DATA" | jq -c '.[]' | while read -r file; do
                    path=$(echo "$file" | jq -r '.path')
                    filename=$(echo "$file" | jq -r '.filename')
                    extension=$(echo "$file" | jq -r '.extension')
                    content=$(echo "$file" | jq -r '.content')
                    folder=$(echo "$file" | jq -r '.folder // empty')

                    # Create the full directory path
                    full_dir="$path"
                    mkdir -p "$full_dir"
                    echo "Ensured directory exists: $full_dir"

                    # Create folder if specified
                    if [ ! -z "$folder" ]; then
                      folder_path="$full_dir$folder"
                      mkdir -p "$folder_path"
                      echo "Created folder: $folder_path"
                      full_dir="$folder_path/"
                    fi

                    # Create the file
                    full_path="$full_dir$filename.$extension"
                    echo "$content" > "$full_path"
                    echo "Created file: $full_path"
                  done

                  echo "Pipeline files and folders created successfully."
                  `,
                ],
                env: [
                  {
                    name: "PIPELINE_DATA",
                    value: files, // This is the JSON string of pipeline files
                  },
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

  const mageService = new k8s.core.v1.Service(
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

  return { mageDeployment, mageService };
};

let mageUrl = null;

mageDeploy().then((res) => {
  mageUrl = res.mageService.status.loadBalancer.ingress[0].ip;
  console.log(`Mage deployed at http://${mageUrl}`);
});

export { mageUrl };
