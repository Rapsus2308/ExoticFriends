import "dotenv/config";
import { createServer } from "node:http";
import { crearApp } from "./app";

const app = crearApp();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ExoticFriends API" });
});

const server = createServer(app);

const port = parseInt(process.env.PORT || "5000", 10);
const host = process.env.SERVER_HOST || "0.0.0.0";

server.listen(
  {
    port,
    host,
  },
  () => {
    console.log(`express server serving on http://${host}:${port}`);
  }
);