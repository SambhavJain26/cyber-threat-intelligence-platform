import dotenv from 'dotenv';
// Load .env early so that subsequent imports (OpenAI client, DB, etc.) can use process.env values
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.warn('[dotenv] No .env file found or failed to parse. Using only process environment variables.');
} else {
  console.log('[dotenv] Loaded environment variables from .env');
}
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectToMongoDB } from "./db/mongodb";
import { storage } from "./storage";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "...";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Check recommended environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[Config] OPENAI_API_KEY is not set. Platform operates in core intelligence mode; AI assistant features require an API key.');
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'dev_jwt_secret_key_change_in_production_32chars';
    console.warn('[Config] JWT_SECRET not provided. Set fallback session secret for demonstration.');
  }

  try {
    await connectToMongoDB();
    (storage as any).setUseMongo?.(true);
    console.log('[Storage] Connected to MongoDB database successfully.');
  } catch (error: any) {
    console.warn(`[Storage] MongoDB not reachable (${error.message}). Operating in resilient in-memory storage mode for demonstration.`);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== 'win32') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
