import { Pool } from "pg";
import { query } from "../../helpers";

export const getLatestBlocks = async (pool: Pool) => {
  try {
    const result = await query(
      pool,
      "SELECT * FROM l0_btc_blocks ORDER BY height DESC LIMIT 10",
    );
    console.log("result", result);
    return result?.rows;
  } catch (error) {
    console.log("Something went wrong ", error);
    throw error;
  }
};
