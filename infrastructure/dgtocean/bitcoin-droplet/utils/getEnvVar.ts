import inquirer from "inquirer";
import { config } from "dotenv";

config();

export const getEnvVar = async (
  name: string,
  promptMessage?: string
): Promise<string> => {
  const value = process.env[name];
  if (value) {
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

  return userInput;
};
