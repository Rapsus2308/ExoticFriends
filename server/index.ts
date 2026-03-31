/**
 * @fileoverview Punto de entrada del servidor — ExoticFriends
 *
 * Responsabilidad única: crear la app Express y arrancar el servidor HTTP.
 * Toda la configuración de middleware y rutas vive en server/app.ts.
 */

import { createServer } from "node:http";
import { crearApp } from "./app";

const app = crearApp();
const server = createServer(app);

const port = parseInt(process.env.PORT || "5000", 10);

server.listen(
  { port, host: "0.0.0.0", reusePort: true },
  () => {
    console.log(`express server serving on port ${port}`);
  }
);
