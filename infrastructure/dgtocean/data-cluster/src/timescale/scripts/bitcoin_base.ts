import { Client } from "pg";
import {
  createAggregatePolicies,
  createContinuousAggregates,
  createTable,
  dropTable,
} from "../utils";
import * as path from "path";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { ICommandsFile } from "../types";

// loads .env from the data-cluster folder level
dotenv.config({
  path: path.join(__dirname, "../../../.env"),
});

const commandsPath = path.join(__dirname, "./commands.json");
const commands = JSON.parse(
  fs.readFileSync(commandsPath, "utf-8")
) as ICommandsFile;

const DB_HOST = process.env.PG_HOST;
const DB_PORT = process.env.PG_PORT;
const DB_USER = process.env.PG_USER;
const DB_PASSWORD = process.env.PG_PASSWORD;
const DB_NAME = process.env.PG_DB;

const client = new Client({
  host: DB_HOST,
  port: Number(DB_PORT),
  password: DB_PASSWORD,
  user: DB_USER,
  database: DB_NAME,
});

const createResources = async () => {
  await Promise.all(
    commands.tables.map(async (table) => await createTable({ client, table }))
  );
  console.log("*** Created tables ***");

  await Promise.all(
    commands.continuous_aggregates.map(
      async (continuousAggregate) =>
        await createContinuousAggregates({
          client,
          continuousAggregate,
        })
    )
  );

  console.log("*** Created continuous aggregates ***");

  await Promise.all(
    commands.aggregate_policies.map(
      async (policy) =>
        await createAggregatePolicies({
          client,
          policy,
        })
    )
  );

  console.log("*** Created policies ***");
  return;
};

const dropResources = async () => {
  await Promise.all(
    commands.tables.map(async (table) => await dropTable({ client, table }))
  );

  console.log("*** Deleted resources ***");
};

const main = async () => {
  await client.connect();
  console.log("*** Connected with the TimescaleDB ***");

  await createResources();

  await client.end();
  return;
};

main();
