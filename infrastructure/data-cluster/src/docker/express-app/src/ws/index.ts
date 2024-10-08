import type { Server as HttpServer } from "http";
import { WebSocket } from "ws";
import { Pool } from "pg";
import { getLatestBlocks } from "../services/postgres";
import { startListeningEvents } from "../services/postgres/startListeningEvents";
import { ExtendedWebSocket, MESSAGE_TYPE } from "../customTypes";

interface IProps {
  pool: Pool;
  httpServer: HttpServer;
}

export const initWebSocket = async ({ httpServer, pool }: IProps) => {
  try {
    const wss = new WebSocket.Server({
      server: httpServer,
      path: "/blocks",
    });

    await startListeningEvents({ wss });

    wss.on("connection", (ws: ExtendedWebSocket) => {
      ws.isAlive = true;
      console.log("Client Connected");

      ws.on("message", async (message: string) => {
        // Receive block transactions
        console.log("Message is", message);
        console.log("Message converted", message.toString());
        const { event, payload } = JSON.parse(message);
        console.info(`Received message : ${event} ${payload}`);

        if (event === MESSAGE_TYPE.INITIAL_DATA) {
          try {
            console.log("Fetching data...");
            const rows = await getLatestBlocks(pool);
            console.log("Rows are", rows);
            const event = {
              event: MESSAGE_TYPE.INITIAL_DATA,
              data: JSON.stringify(rows),
            };
            ws.send(JSON.stringify(event));
          } catch (error) {
            console.log("Something went wrong", error);
          }
        }
      });
    });
  } catch (error) {
    console.log("Something went wrong", error);
  }
};
