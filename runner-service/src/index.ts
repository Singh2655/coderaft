import { initWs } from "./ws";
import express from "express";
import http from "http";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const httpServer = http.createServer(app);
initWs(httpServer);

httpServer.listen(3002, () =>
  console.log("http server is listening on port 3002")
);
