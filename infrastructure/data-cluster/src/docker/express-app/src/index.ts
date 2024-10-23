import express from "express";
import http from "http";
import { initWebSocket } from "./ws";
import { setupDbPool } from "./db";

const initServer = async () => {
  const app = express();
  const PORT = 4000;

  const httpServer = http.createServer(app);

  const pool = setupDbPool();

  await initWebSocket({ httpServer, pool });

  httpServer.listen(PORT, () => {
    console.info(`App is running on port: ${PORT}`);
  });
};

initServer();
