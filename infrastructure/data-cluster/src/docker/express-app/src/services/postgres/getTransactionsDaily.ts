import { Pool } from "pg";
import { query } from "../../helpers";

export const getTransactionsDaily = async (pool: Pool) => {
  try {
    const result = await query(
      pool,
      "SELECT * FROM btc_transactions_volume_daily  ORDER BY time DESC LIMIT 10",
    );
    console.log("result", result);
    return result?.rows;
  } catch (error) {
    console.log("Something went wrong ", error);
    throw error;
  }
};
