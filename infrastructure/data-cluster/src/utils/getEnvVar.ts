import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export async function getEnvVar(key: string): Promise<string> {
  return new Promise((resolve) => {
    const value = process.env[key];
    if (value) {
      resolve(value);
    } else {
      rl.question(`${key}: `, (answer) => {
        resolve(answer);
      });
    }
  });
}

export async function setEnvVar(key: string, value: string): Promise<void> {
  process.env[key] = value;
  const envFile = '.env';
  const envContent = fs.readFileSync(envFile, 'utf8');
  const updatedContent = envContent.includes(`${key}=`)
    ? envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`)
    : `${envContent}\n${key}=${value}`;
  fs.writeFileSync(envFile, updatedContent);
}
