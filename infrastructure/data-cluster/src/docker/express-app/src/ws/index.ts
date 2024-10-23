import type { Server as HttpServer } from "http";
import { WebSocket } from "ws";
import { Pool } from "pg";
import {
  getLatestBlocks,
  getTickerPrice,
  getTransactionsDaily,
  getTransactionsFiveMin,
} from "../services/postgres";
import { startListeningEvents } from "../services/postgres/startListeningEvents";
import { ExtendedWebSocket, MESSAGE_TYPE } from "../customTypes";
import { randomUUID } from "crypto";

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
      ws.id = randomUUID();
      console.log("Client Connected", ws.id);

      ws.on("message", async (message: string) => {
        // Receive block transactions
        console.log("Message is", message);
        console.log("Message converted", message.toString());
        const { event, payload } = JSON.parse(message);
        console.info(`Received message : ${event} ${payload}`);

        if (event === MESSAGE_TYPE.INITIAL_DATA) {
          try {
            console.log("Fetching data...");
            const latestBlocks = await getLatestBlocks(pool);
            console.log("Latest blocks", latestBlocks);
            const blockEvent = {
              event: MESSAGE_TYPE.INITIAL_BLOCKS,
              data: JSON.stringify(latestBlocks),
            };
            const transactionsDaily = await getTransactionsDaily(pool);
            console.log("Transactions daily", transactionsDaily);
            const transactionEvent = {
              event: MESSAGE_TYPE.INITIAL_DAILY_TRANSACTIONS,
              data: JSON.stringify(transactionsDaily),
            };
            // const transactionsFiveMin = await getTransactionsFiveMin(pool);
            // console.log("Transactions five min", transactionsFiveMin);
            const tickerPrice = await getTickerPrice(pool);
            const tickerPriceEvent = {
              event: MESSAGE_TYPE.INITIAL_TICKER_PRICE,
              data: JSON.stringify(tickerPrice),
            };
            ws.send(JSON.stringify(blockEvent));
            ws.send(JSON.stringify(transactionEvent));
            // ws.send(JSON.stringify(transactionsFiveMin));
            ws.send(JSON.stringify(tickerPriceEvent));
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
