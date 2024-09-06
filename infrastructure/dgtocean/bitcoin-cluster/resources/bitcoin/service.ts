import * as k8s from "@pulumi/kubernetes";

import { bitcoinNamespace } from "./namespace";
import { k8sProvider } from "./cluster";
import { bitcoinDeployment } from "./deployment";

export const bitcoinService = new k8s.core.v1.Service(
    "bitcoin-service",
    {
        metadata: {
            name: "bitcoin-service",
            namespace: bitcoinNamespace.metadata.name,
        },
        spec: {
            type: "LoadBalancer",
            selector: { app: "bitcoin" }, // Update selector to match deployment labels
            ports: [
                { name: "rpc", port: 8332, targetPort: 8332 },
                { name: "p2p", port: 8333, targetPort: 8333 },
            ],
        },
    },
    { provider: k8sProvider, dependsOn: [bitcoinDeployment] }
);
