import { getEnvVar } from "./getEnvVar";

const requiredEnvVars = [
    "DROPLET_PASSWORD",
    "DROPLET_IP",
    "VOLUME_NAME",
    "RPC_USER",
    "RPC_PASSWORD",
];

export const checkAndPromptEnvVars = async () => {
    for (const envVar of requiredEnvVars) {
        await getEnvVar(envVar);
    }
};
