import { Pool } from "pg";
import { getEnvs } from "../helpers";

export const setupDbPool = () => {
  const envs = getEnvs();
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = envs;

  if ([DB_USER, DB_PASSWORD, DB_HOST, DB_NAME].some((value) => !value)) {
    console.error("Some envs are missing", envs);
  }

  const pool = new Pool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    application_name: "local_server",
  });

  return pool;
};
