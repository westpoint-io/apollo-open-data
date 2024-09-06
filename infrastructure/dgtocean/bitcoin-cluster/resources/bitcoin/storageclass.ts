import * as k8s from "@pulumi/kubernetes";

import { k8sProvider } from "./cluster";

export const storageClass = new k8s.storage.v1.StorageClass(
    "bitcoin-storageclass",
    {
        metadata: {
            name: "bitcoin-storageclass",
        },
        provisioner: "dobs.csi.digitalocean.com",
        allowVolumeExpansion: true,
        parameters: {
            type: "gp2",
        },
    },
    { provider: k8sProvider }
);
