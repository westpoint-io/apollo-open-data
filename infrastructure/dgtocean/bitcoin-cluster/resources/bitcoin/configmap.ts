import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";
import * as path from "path";

import { bitcoinNamespace } from "./namespace";
import { k8sProvider } from "./cluster";

// Read the Python script file
const pythonScriptPath = path.join(
    __dirname,
    "../../docker/bitcoin/post_messages.py"
);
const pythonScriptContent = fs.readFileSync(pythonScriptPath, "utf8");

// Create a ConfigMap for the Python script
export const pythonScriptConfigMap = new k8s.core.v1.ConfigMap(
    "python-script-configmap",
    {
        metadata: {
            name: "python-script-configmap",
            namespace: bitcoinNamespace.metadata.name,
        },
        data: {
            "post_messages.py": pythonScriptContent,
        },
    },
    { provider: k8sProvider }
);
