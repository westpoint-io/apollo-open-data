import createSubscriber from "pg-listen";
import { WebSocket, Server } from "ws";
import { ExtendedWebSocket, MESSAGE_TYPE } from "../../customTypes";
import { getEnvs } from "../../helpers";
import { IncomingMessage } from "http";

interface IProps {
  wss: Server<typeof WebSocket, typeof IncomingMessage>;
}

export const startListeningEvents = async ({ wss }: IProps) => {
  const envs = getEnvs();
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = envs;

  if ([DB_USER, DB_PASSWORD, DB_HOST, DB_NAME].some((value) => !value)) {
    console.error("Some envs are missing", envs);
  }

  const subscriber = createSubscriber({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const CHANNEL_NEW_BLOCK = "new_block";
  const CHANNEL_NEW_TICKER_PRICE = "new_ticker_price";
  const CHANNEL_NEW_TRANSACTION = "new_transactions";

  subscriber.notifications.on(CHANNEL_NEW_BLOCK, (payload) => {
    console.log(
      `Received notification in ${CHANNEL_NEW_BLOCK}: ${JSON.stringify(payload)}`,
    );
    console.log("Clients are", wss.clients.size);
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const event = {
        event: MESSAGE_TYPE.BLOCKS_NEW_ROW,
        data: JSON.stringify(payload),
      };
      console.log("EVent is", event);
      client.send(JSON.stringify(event));
    });
  });

  subscriber.notifications.on(CHANNEL_NEW_TRANSACTION, (payload) => {
    console.log(
      `Received notification in ${CHANNEL_NEW_TRANSACTION}: ${JSON.stringify(payload)}`,
    );
    console.log("Clients are", wss.clients.size);
    wss.clients.forEach((client) => {
      const wsClient = client as ExtendedWebSocket;
      if (wsClient.readyState !== WebSocket.OPEN) return;
      const event = {
        event: MESSAGE_TYPE.TRANSACTIONS_NEW_ROW,
        data: JSON.stringify(payload),
      };
      console.log("Event is", event);
      wsClient.send(JSON.stringify(event));
      console.log(`Sending event ${event.event} to client ${wsClient.id}`);
    });
  });

  subscriber.notifications.on(CHANNEL_NEW_TICKER_PRICE, (payload) => {
    console.log(
      `Received notification in ${CHANNEL_NEW_TICKER_PRICE}: ${JSON.stringify(payload)}`,
    );
    console.log("Clients are", wss.clients.size);
    wss.clients.forEach((client) => {
      const wsClient = client as ExtendedWebSocket;
      if (wsClient.readyState !== WebSocket.OPEN) return;
      const event = {
        event: MESSAGE_TYPE.TICKER_PRICE_NEW_ROW,
        data: JSON.stringify(payload),
      };
      console.log("Event is", event);
      wsClient.send(JSON.stringify(event));
      console.log(`Sending event ${event.event} to client ${wsClient.id}`);
    });
  });

  subscriber.events.on("error", (error) => {
    console.error("Fatal database connection error:", error);
    process.exit(1);
  });

  process.on("exit", () => {
    subscriber.close();
  });

  await subscriber.connect();
  await Promise.all([
    await subscriber.listenTo(CHANNEL_NEW_BLOCK),
    await subscriber.listenTo(CHANNEL_NEW_TICKER_PRICE),
  ]);
};
