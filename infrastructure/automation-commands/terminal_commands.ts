import { execSync, exec } from "child_process";
import { getEnvVar } from "./utils/getEnvVar";

interface RequiredEnvVars {
  DROPLET_PASSWORD: string;
  DROPLET_IP: string;
  VOLUME_NAME: string;
  RPC_USER: string;
  RPC_PASSWORD: string;
}

export const deployInfra = async (ctx: string) => {
  // Check and set all required environment variables
  const requiredVars: Partial<RequiredEnvVars> = {
    DROPLET_PASSWORD: await getEnvVar("DROPLET_PASSWORD"),
    RPC_USER: await getEnvVar("RPC_USER"),
    RPC_PASSWORD: await getEnvVar("RPC_PASSWORD"),
  };

  // Combine existing process.env with the new required variables
  const envVars = { ...process.env, ...requiredVars };

  execSync("pulumi up --yes", { env: envVars, stdio: "inherit" });
};

export const importResources = async () => {
  // Check and set all required environment variables
  const requiredVars = {
    EXISTING_DROPLET_ID: await getEnvVar("EXISTING_DROPLET_ID"),
    EXISTING_VOLUME_ID: await getEnvVar("EXISTING_VOLUME_ID"),
  };

  // Combine existing process.env with the new required variables
  const envVars = { ...process.env, ...requiredVars };

  exec("yarn pulumi:import", { env: envVars }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing importResources: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
};
