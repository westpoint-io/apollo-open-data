import { Client } from "pg";
import { IAggregatePolicies, IContinuousAggregates, ITable } from "../types";

type TableProps = {
  client: Client;
  table: ITable;
};

export const createTable = async ({ client, table }: TableProps) => {
  const tableCommand = `CREATE TABLE public.${table.name} (
    ${table.columns.map(({ name, type }) => `${name} ${type} NULL`).join(",")}
  );`;

  await client.query(tableCommand);

  const constraintCommand = `ALTER TABLE ${table.name}
    ADD CONSTRAINT ${table.constraint.name} UNIQUE (${table.constraint.columns
    .map((column) => column)
    .join(",")});
  `;

  await client.query(constraintCommand);

  if (table.hypertable) {
    await client.query(`
      SELECT create_hypertable('${table.name}', '${table.hypertable?.columnName}');
    `);
  }
};

export const createContinuousAggregates = async ({
  client,
  continuousAggregate,
}: {
  client: Client;
  continuousAggregate: IContinuousAggregates;
}) => {
  const command = `
    CREATE MATERIALIZED VIEW ${continuousAggregate.name}
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    ${continuousAggregate.query}
  `;

  await client.query(command);
};

export const createAggregatePolicies = async ({
  client,
  policy,
}: {
  client: Client;
  policy: IAggregatePolicies;
}) => {
  const command = `
    SELECT add_continuous_aggregate_policy(
      continuous_aggregate => '${policy.name}',
      start_offset => INTERVAL '${policy.startOffset}',
      end_offset => INTERVAL '${policy.endOffset}',
      schedule_interval => INTERVAL '${policy.scheduleInterval}'
    )
  `;

  await client.query(command);
};

export const dropTable = async ({ client, table }: TableProps) => {
  await client.query(`
    DROP TABLE ${table.name} CASCADE;
  `);
};
