import { execSync } from "child_process";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface StackConfig {
  name: string;
  path: string;
}

const stacks: StackConfig[] = [
  {
    name: "automate-data-cluster",
    path: path.join(__dirname, "data-cluster"),
  },
  {
    name: "automated-bitcoin-droplet",
    path: path.join(__dirname, "bitcoin-droplet"),
  },
  {
    name: "automated-automation-commands",
    path: path.join(__dirname, "automation-commands"),
  },
];

function executeCommand(command: string, cwd: string) {
  try {
    execSync(command, { cwd, stdio: "inherit" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
  }
}

async function refreshAndDestroyStack(stack: StackConfig) {
  console.log(`Processing stack: ${stack.name}`);

  console.log(`Refreshing resources for stack ${stack.name}...`);
  executeCommand("pulumi refresh --yes", stack.path);

  console.log(`Destroying resources for stack ${stack.name}...`);
  executeCommand("pulumi destroy --yes", stack.path);

  console.log(`Removing stack ${stack.name}...`);
  executeCommand(`pulumi stack rm ${stack.name} --yes`, stack.path);

  console.log(`Stack ${stack.name} processed successfully.`);
}

async function deleteAllStacks() {
  for (const stack of stacks) {
    await refreshAndDestroyStack(stack);
  }
}

deleteAllStacks().catch((err) => {
  console.error("Error during stack deletion:", err);
});
