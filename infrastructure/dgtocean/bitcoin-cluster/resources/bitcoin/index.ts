import * as pulumi from "@pulumi/pulumi";

import { bitcoinService } from "./service";
import { bitcoinDeployment } from "./deployment";
import { pythonScriptConfigMap } from "./configmap";
import { bitcoinNamespace } from "./namespace";
import { bitcoinCluster } from "./cluster";
import { bitcoinPVC } from "./volume";
import { storageClass } from "./storageclass";

export const mountBitcoinResources = () => {
    const bitcoinServiceName = bitcoinService.metadata.name;

    const pythonScriptConfigMapName = pythonScriptConfigMap.metadata.name;

    const bitcoinNamespaceName = bitcoinNamespace.metadata.name;

    const kubeconfig = pulumi.secret(
        bitcoinCluster.kubeConfigs[0].rawConfig
    );

    const bitcoinDeploymentStatus = bitcoinDeployment.status;
    const bitcoinDeploymentSpec = bitcoinDeployment.spec;

    const bitcoinPVCStatus = bitcoinPVC.status.phase;

    const bitcoinStorageClassName = storageClass.metadata.name;

    return {
        bitcoinServiceName,
        pythonScriptConfigMapName,
        bitcoinNamespaceName,
        kubeconfig,
        bitcoinDeploymentStatus,
        bitcoinDeploymentSpec,
        bitcoinPVCStatus,
        bitcoinStorageClassName,
    }
}
