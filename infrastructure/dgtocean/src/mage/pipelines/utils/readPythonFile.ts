import { promises as fs } from "fs";

export async function readPythonFile(path: string) {
  try {
    const data = await fs.readFile(path, "utf-8");
    return data;
  } catch (err) {
    console.error("Error reading the file:", err);
    return "";
  }
}
