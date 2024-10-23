import { execSync } from "child_process";
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import { BuiltInQuestion } from "inquirer/dist/cjs/types/types";

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// Stack name and data-cluster project path
const stackName = "automate-data-cluster";
const dataClusterPath = "./data-cluster";
const digitalOceanToken = process.env.DIGITALOCEAN_TOKEN;
const dataClusterEnvPath = path.resolve(dataClusterPath, ".env");

const exportEnv = (name: string, value: string) => {
  execSync(`export ${name}=${value}`);
};

const loadEnvVariables = (envPath: string) => {
  if (!existsSync(envPath)) return {}; // If the file doesn't exist, return an empty object

  const envContent = readFileSync(envPath, { encoding: "utf8" });
  const envVariables: { [key: string]: string } = {};

  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      envVariables[key.trim()] = value.trim();
    }
  });

  return envVariables;
};

async function promptForPasswords() {
  const existingEnv = loadEnvVariables(dataClusterEnvPath);

  const questions = [];

  if (!existingEnv.PG_PASSWORD) {
    questions.push({
      type: "password",
      name: "PG_PASSWORD",
      message: "Enter the password for Timescale (Postgres):",
      mask: "*",
      validate: (input: string) =>
        input.length >= 8 || "Password must be at least 8 characters long.",
    });
  }

  if (!existingEnv.GRAFANA_ADMIN_PASSWORD) {
    questions.push({
      type: "password",
      name: "GRAFANA_ADMIN_PASSWORD",
      message: "Enter the password for Grafana:",
      mask: "*",
      validate: (input: string) =>
        input.length >= 8 || "Password must be at least 8 characters long.",
    });
  }

  // If there are no questions (both passwords exist), skip prompting
  if (questions.length === 0) {
    console.log(
      "Both PG_PASSWORD and GRAFANA_ADMIN_PASSWORD already exist in the .env file."
    );
    exportEnv("PG_PASSWORD", existingEnv.PG_PASSWORD);
    return existingEnv; // Return the existing env values if no prompts are needed
  }

  const answers = (await inquirer.prompt(questions as BuiltInQuestion[])) as {
    [key: string]: string;
  };

  savePasswordsToEnvFile(answers);

  const env = { ...existingEnv, ...answers };
  exportEnv("PG_PASSWORD", env.PG_PASSWORD);
  return env;
}

const savePasswordsToEnvFile = (passwords: { [key: string]: string }) => {
  const keys = Object.keys(passwords);

  const envContent = keys.map((key) => `\n${key}=${passwords[key]}\n`).join("");

  // Ensure the .env file is created in the `./data-cluster` folder
  if (!existsSync(dataClusterEnvPath)) {
    console.log(`Creating new .env file inside ${dataClusterEnvPath}.`);
    writeFileSync(dataClusterEnvPath, envContent);
  } else {
    console.log(`Updating existing .env file inside ${dataClusterEnvPath}.`);
    appendFileSync(dataClusterEnvPath, envContent);
  }
  console.log(`Passwords saved to .env file inside ${dataClusterPath}`);
};

const checkOrCreateStack = () => {
  try {
    // Run the pulumi stack ls command and check if the stack exists
    const stacks = execSync(`pulumi stack ls --json`, {
      cwd: dataClusterPath,
    }).toString();
    const stackList = JSON.parse(stacks);

    const stackExists = stackList.some(
      (stack: any) => stack.name === stackName
    );
    if (stackExists) {
      console.log(`Stack ${stackName} already exists.`);
    } else {
      console.log(`Stack ${stackName} doesn't exist. Creating...`);
      execSync(`pulumi stack init ${stackName}`, { cwd: dataClusterPath });

      writeFileSync(dataClusterEnvPath, "");

      console.log(`Stack ${stackName} created.`);
    }
  } catch (e) {
    console.error("Error checking or creating the stack:", e);
  }
};

const runPulumiUp = () => {
  // Set the DigitalOcean token using Pulumi config
  if (digitalOceanToken) {
    console.log("Setting DigitalOcean token...");
    execSync(
      `pulumi config set --secret digitalocean:token ${digitalOceanToken}`,
      { cwd: dataClusterPath }
    );
    console.log("DigitalOcean token set.");
  } else {
    throw "DIGITALOCEAN_TOKEN not found in .env file.";
  }
  console.log(`Running pulumi up for stack ${stackName}...`);
  execSync(`export PULUMI_K8S_ENABLE_PATCH_FORCE=true && pulumi up --yes`, {
    cwd: dataClusterPath,
    stdio: "inherit",
  });
  console.log("Pulumi up complete.");
};

// Get the Timescale IP from the outputs
const getTimescaleIp = () => {
  try {
    console.log(`Fetching timescaleIp for stack ${stackName}...`);
    const output = execSync(`pulumi stack output timescaleIp`, {
      cwd: dataClusterPath,
    }).toString();

    const ip = output.trim();
    return ip;
  } catch (error) {
    console.error("Error fetching timescaleIp:", error);
    throw error;
  }
};

const getGrafanaIp = () => {
  try {
    console.log(`Fetching grafanaIp for stack ${stackName}...`);
    const output = execSync(`pulumi stack output grafanaIp`, {
      cwd: dataClusterPath,
    }).toString();
    const ip = output.trim();
    return ip;
  } catch (error) {
    console.error("Error fetching grafanaIp:", error);
    throw error;
  }
};

// Save Timescale IP to .env
const createDbBase = async (ip: string) => {
  const envsToAdd = {
    PG_HOST: ip,
    PG_PORT: 5432,
    PG_USER: "postgres",
    PG_DB: "postgres",
  };

  const currentEnv = loadEnvVariables(dataClusterEnvPath);

  const missingEnv = Object.entries(envsToAdd).reduce((acc, [key, value]) => {
    if (!currentEnv[key] || currentEnv[key] !== value.toString()) {
      acc.push(`${key}=${value}`);
    }
    return acc;
  }, [] as string[]);

  const envContent = missingEnv.join("\n");

  if (envContent) {
    if (!existsSync(dataClusterEnvPath)) {
      console.log(`Creating new .env file inside ${dataClusterEnvPath}.`);
      writeFileSync(dataClusterEnvPath, envContent + "\n");
    } else {
      console.log(`Updating existing .env file inside ${dataClusterEnvPath}.`);
      appendFileSync(dataClusterEnvPath, "\n" + envContent + "\n");
    }
  } else {
    console.log("No missing environment variables to add.");
  }

  try {
    execSync(`ts-node ./src/timescale/scripts/bitcoin_base.ts`, {
      cwd: path.resolve(dataClusterPath),
      stdio: "inherit", // Passes logs to the console
    });
    console.log("Timescale script executed successfully.");
  } catch (err) {
    console.error("Error running the timescale script:", err);
  }
};

const createGrafanaBase = async (ip: string) => {
  const envsToAdd = {
    GRAFANA_LB_IP: ip,
  };

  const currentEnv = loadEnvVariables(dataClusterEnvPath);

  const missingEnv = Object.entries(envsToAdd).reduce((acc, [key, value]) => {
    if (!currentEnv[key] || currentEnv[key] !== value.toString()) {
      acc.push(`${key}=${value}`);
    }
    return acc;
  }, [] as string[]);

  const envContent = missingEnv.join("\n");

  if (envContent) {
    if (!existsSync(dataClusterEnvPath)) {
      console.log(`Creating new .env file inside ${dataClusterEnvPath}.`);
      writeFileSync(dataClusterEnvPath, envContent + "\n");
    } else {
      console.log(`Updating existing .env file inside ${dataClusterEnvPath}.`);
      appendFileSync(dataClusterEnvPath, "\n" + envContent + "\n");
    }
  }

  try {
    execSync(`ts-node ./src/grafana/scripts/grafana_base.ts`, {
      cwd: path.resolve(dataClusterPath),
      stdio: "inherit", // Passes logs to the console
    });
    console.log("Grafana script executed successfully.");
  } catch (err) {
    console.error("Error running the grafana script:", err);
  }
};

// Main deployment function
async function deploy() {
  checkOrCreateStack();

  await promptForPasswords();

  runPulumiUp();
  const timescaleIp = getTimescaleIp();
  const grafanaIp = getGrafanaIp();
  await Promise.allSettled([
    createDbBase(timescaleIp),
    createGrafanaBase(grafanaIp),
  ]);
}

// Run the deployment
deploy().catch((err) => {
  console.error("Error during deployment:", err);
});
