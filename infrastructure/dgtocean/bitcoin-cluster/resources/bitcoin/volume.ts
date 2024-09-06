import * as k8s from "@pulumi/kubernetes";

import { k8sProvider } from "./cluster";
import { bitcoinNamespace } from "./namespace";
import { storageClass } from "./storageclass";

// Create the PersistentVolumeClaim
export const bitcoinPVC = new k8s.core.v1.PersistentVolumeClaim(
    "bitcoin-pvc",
    {
        metadata: {
            name: "bitcoin-pvc",
            namespace: bitcoinNamespace.metadata.name,
        },
        spec: {
            accessModes: ["ReadWriteOnce"],
            resources: {
                requests: {
                    storage: "700Gi",
                },
            },
            storageClassName: storageClass.metadata.name,
        },
    },
    { provider: k8sProvider }
);
