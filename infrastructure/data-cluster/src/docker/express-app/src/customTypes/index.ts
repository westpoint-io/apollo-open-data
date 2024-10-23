import { WebSocket } from "ws";

export enum MESSAGE_TYPE {
  INITIAL_DATA = "initial_data",
  INITIAL_BLOCKS = "blocks_initial_data",
  INITIAL_DAILY_TRANSACTIONS = "transactions_daily_initial_data",
  INITIAL_TICKER_PRICE = "ticker_price_initial_data",
  BLOCKS_NEW_ROW = "blocks_new_row",
  TRANSACTIONS_NEW_ROW = "transactions_new_row",
  TICKER_PRICE_NEW_ROW = "ticker_price_new_row",
}

export interface ExtendedWebSocket extends WebSocket {
  id: string;
  isAlive: boolean;
}
