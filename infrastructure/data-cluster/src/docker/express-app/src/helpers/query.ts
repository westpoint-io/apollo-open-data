import { Pool } from "pg";

export const query = async (pool: Pool, text: string) => {
  const client = await pool.connect();
  try {
    const result = client.query(text);
    return result;
  } catch (error) {
    console.error("Something went wrong", error);
  } finally {
    client.release();
  }
};
