import { config } from "dotenv";
import { appendFileSync } from "fs";

import inquirer from "inquirer";
import chalk from "chalk";
import * as path from "path";


config();

export const writeEnvVarToFile = (name: string, value: string) => {
  const dataClusterEnvPath = path.join(__dirname, "..", ".env");

  const envContent = `${name}=${value}\n`;
  appendFileSync(dataClusterEnvPath, envContent);
}

export const getEnvVar = async (
  name: string,
  promptMessage?: string
): Promise<string> => {
  const value = process.env[name];
  if (value && value != "null") {
    return value;
  }

  if (!promptMessage) {
    promptMessage = `🤓 Please enter a value for ${name}:`;
  } else {
    // Add a rocket emoji to the custom prompt message
    promptMessage = `🚀 ${promptMessage}`;
  }

  const { userInput } = await inquirer.prompt([
    {
      type: "password",
      name: "userInput",
      message: chalk.blue(promptMessage),
      mask: "*",
    },
  ]);

  process.env[name] = userInput;
  writeEnvVarToFile(name, userInput);

  console.log(chalk.green(`✅ Value for ${name} has been set successfully!`));

  return userInput;
};
