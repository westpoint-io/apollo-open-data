import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const stackName = "automate-data-cluster";
const dataClusterPath = "./data-cluster";

// Function to destroy the stack's resources
function destroyStackResources() {
  try {
    console.log(`Destroying resources for stack ${stackName}...`);
    execSync(`pulumi refresh --yes`, {
      cwd: dataClusterPath,
      stdio: "inherit",
    });
    execSync(`pulumi destroy --yes`, {
      cwd: dataClusterPath,
      stdio: "inherit",
    });
    console.log(`Resources for stack ${stackName} destroyed.`);
  } catch (e) {
    console.error("Error during stack destruction:", e);
  }
}

// Function to delete the stack itself
function deletePulumiStack() {
  try {
    console.log(`Deleting stack ${stackName}...`);
    execSync(`pulumi stack rm ${stackName} --yes`, {
      cwd: dataClusterPath,
      stdio: "inherit",
    });
    console.log(`Stack ${stackName} deleted.`);
  } catch (e) {
    console.error("Error deleting the stack:", e);
  }
}

async function deleteStack() {
  destroyStackResources();
  deletePulumiStack();
}

deleteStack().catch((err) => {
  console.error("Error during stack deletion:", err);
});
