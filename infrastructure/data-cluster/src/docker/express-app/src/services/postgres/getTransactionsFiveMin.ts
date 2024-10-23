import { Pool } from "pg";
import { query } from "../../helpers";

export const getTransactionsFiveMin = async (pool: Pool) => {
  const BTC_BLOCKS_FIVE_MIN_TABLE_NAME =
    process.env.BTC_BLOCKS_FIVE_MIN_TABLE_NAME;

  if (!BTC_BLOCKS_FIVE_MIN_TABLE_NAME)
    throw new Error("Btc blocks five min table name not set");

  const queryString = `select * from ${BTC_BLOCKS_FIVE_MIN_TABLE_NAME} ORDER BY bucket DESC;`;

  try {
    const result = await query(pool, queryString);
    console.log("result", result);
    return result?.rows;
  } catch (error) {
    console.log("Something went wrong ", error);
    throw error;
  }
};
