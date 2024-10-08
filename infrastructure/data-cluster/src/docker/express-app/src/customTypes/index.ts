import { WebSocket } from "ws";

export enum MESSAGE_TYPE {
  INITIAL_DATA = "blocks_initial_data",
  NEW_ROW = "blocks_new_row",
}

export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}
