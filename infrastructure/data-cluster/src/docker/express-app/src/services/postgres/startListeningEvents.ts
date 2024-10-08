import createSubscriber from "pg-listen";
import { WebSocket, Server } from "ws";
import { MESSAGE_TYPE } from "../../customTypes";
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

  const CHANNEL = "new_block";

  subscriber.notifications.on(CHANNEL, (payload) => {
    console.log(
      `Received notification in ${CHANNEL}: ${JSON.stringify(payload)}`,
    );
    console.log("Clients are", wss.clients);
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const event = {
        event: MESSAGE_TYPE.NEW_ROW,
        data: JSON.stringify(payload),
      };
      console.log("EVent is", event);
      client.send(JSON.stringify(event));
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
  await subscriber.listenTo(CHANNEL);
};
