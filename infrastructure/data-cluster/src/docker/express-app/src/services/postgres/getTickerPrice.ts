import { Pool } from "pg";
import { query } from "../../helpers";

export const getTickerPrice = async (pool: Pool) => {
  const BTC_USD_TICKER_PRICE_TABLE_NAME =
    process.env.BTC_USD_TICKER_PRICE_TABLE_NAME;

  if (!BTC_USD_TICKER_PRICE_TABLE_NAME)
    throw new Error("Ticker Price table name not set");

  const queryString = `select * from ${BTC_USD_TICKER_PRICE_TABLE_NAME} order by timestamp desc limit 10`;

  try {
    const result = await query(pool, queryString);
    console.log("result", result);
    return result?.rows;
  } catch (error) {
    console.log("Something went wrong ", error);
    throw error;
  }
};
