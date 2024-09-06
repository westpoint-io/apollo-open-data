import * as k8s from "@pulumi/kubernetes";

import { k8sProvider } from "./cluster";

export const bitcoinNamespace = new k8s.core.v1.Namespace(
    "bitcoin-namespace",
    {
        metadata: { name: "bitcoin" },
    },
    { provider: k8sProvider }
);
