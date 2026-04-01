import "dotenv/config";
import { createServer } from "node:http";
import { crearApp } from "./app";

const app = crearApp();
const server = createServer(app);

const port = parseInt(process.env.PORT || "5000", 10);

server.listen(
  {
    port,
    host: "0.0.0.0",
  },
  () => {
    console.log(`express server serving on http://0.0.0.0:${port}`);
  }
);