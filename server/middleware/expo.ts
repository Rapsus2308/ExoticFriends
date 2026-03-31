/**
 * @fileoverview Middleware para servir la app Expo y la landing page.
 *
 * Detecta el encabezado `expo-platform` para servir el manifest JSON
 * de la plataforma correspondiente (iOS / Android). Si la petición
 * viene de un navegador web, sirve la landing page HTML.
 */

import * as fs from "fs";
import * as path from "path";
import type { Application, Request, Response, NextFunction } from "express";

/** Lee el nombre de la app desde app.json (para la landing page). */
function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

/** Sirve el manifest de Expo para una plataforma específica. */
function serveExpoManifest(platform: string, res: Response): void {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
    return;
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

/** Sirve la landing page HTML con las variables de entorno inyectadas. */
function serveLandingPage(
  req: Request,
  res: Response,
  template: string,
  appName: string
): void {
  const protocol = req.header("x-forwarded-proto") || req.protocol || "https";
  const host = req.header("x-forwarded-host") || req.get("host");
  const baseUrl = `${protocol}://${host}`;

  const html = template
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, host ?? "")
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

/**
 * Configura el servicio de archivos estáticos de Expo y la landing page.
 *
 * @param app - Instancia de la aplicación Express
 */
export function setupExpoAndLanding(app: Application): void {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  console.log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path !== "/" && req.path !== "/manifest") return next();

    const platform = req.header("expo-platform");
    if (platform === "ios" || platform === "android") {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }

    next();
  });

  app.use("/assets", express_static(path.resolve(process.cwd(), "assets")));
  app.use(express_static(path.resolve(process.cwd(), "static-build")));

  console.log("Expo routing: Checking expo-platform header on / and /manifest");
}

// Helper to avoid importing express in this file (express.static is a function)
import expressLib from "express";
const express_static = expressLib.static;
