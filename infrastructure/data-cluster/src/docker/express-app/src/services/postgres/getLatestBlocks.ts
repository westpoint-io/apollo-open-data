import { Pool } from "pg";
import { query } from "../../helpers";

export const getLatestBlocks = async (pool: Pool) => {
  const BTC_BLOCKS_TABLE_NAME = process.env.BTC_BLOCKS_TABLE_NAME;

  if (!BTC_BLOCKS_TABLE_NAME) throw new Error("Btc blocks table name not set");

  const queryString = `SELECT * FROM ${BTC_BLOCKS_TABLE_NAME} ORDER BY height DESC LIMIT 10`;

  try {
    const result = await query(pool, queryString);
    console.log("result", result);
    return result?.rows;
  } catch (error) {
    console.log("Something went wrong ", error);
    throw error;
  }
};
