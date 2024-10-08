import inquirer from "inquirer";
import { deployInfra, importResources } from "./terminal_commands";

const main = async () => {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        {
          name: "Deploy Infrastructure and install dependencies",
          value: "deployInfra",
        },
        { name: "Import Resources", value: "importResources" },
      ],
    },
  ]);

  switch (action) {
    case "deployInfra":
      await deployInfra("infra");
      break;
    case "importResources":
      await importResources();
      break;
  }
};

deployInfra("infra").catch(err => console.error(err))
