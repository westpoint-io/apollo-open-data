import inquirer from "inquirer";
import { config } from "dotenv";
import { appendFileSync } from "fs";
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
    promptMessage = `Please enter a value for ${name}:`;
  }

  const { userInput } = await inquirer.prompt([
    {
      type: "input",
      name: "userInput",
      message: promptMessage,
    },
  ]);

  process.env[name] = userInput;
  writeEnvVarToFile(name, userInput);

  return userInput;
};
