import * as k8s from "@pulumi/kubernetes";
import { execSync } from "child_process";

export const getKubernetesConfig = (providerName: string) => {
  const kubernetesClusterId = process.env.KUBERNETES_CLUSTER_ID;

  if (!kubernetesClusterId) throw new Error("No kubernetes cluster id found");

  const kubeconfig = execSync(
    `doctl kubernetes cluster kubeconfig show ${kubernetesClusterId}`,
    {
      encoding: "utf-8",
    },
  );

  const k8sProvider = new k8s.Provider(providerName, {
    kubeconfig: kubeconfig,
  });

  return { k8sProvider, kubeconfig };
};
