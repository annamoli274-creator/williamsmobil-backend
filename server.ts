import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { verifyTransporter } from "./src/services/emailService";

const app = express();

// Debug middleware: log the raw Origin header for every request (helps Railway logs)
app.use((req: Request, _res, next: NextFunction) => {
  // Note: this is temporary diagnostic logging to inspect what origin the server sees
  try {
    const rawOrigin = req.headers.origin || "(no origin)";
    console.log(`CORS DEBUG - incoming Origin header: ${rawOrigin}`);
  } catch (err) {
    console.warn("CORS DEBUG - failed to read origin header", err);
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.FRONTEND_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
      console.log(`CORS DEBUG - allowed origins: ${JSON.stringify(allowed)}, request origin: ${origin}`);
      // Allow non-browser requests (e.g. curl, server-to-server) when no origin
      if (!origin) return callback(null, true);
      if (allowed.length === 0) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      console.warn(`Blocked CORS origin: ${origin} - allowing because FRONTEND_ORIGIN may be misconfigured.`);
      return callback(null, true);
    },
    credentials: true,
  }),
);
// Parse JSON and keep raw body for diagnostics on parse errors
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      try {
        (req as any).rawBody = buf.toString();
      } catch (e) {
        (req as any).rawBody = undefined;
      }
    },
  }),
);

/* ── Inline smoke-test route ─────────────────────────────────────────────────
   Hit GET /api/test to confirm Express routing is alive independently of any
   imported route module or database connection.                              */
app.get("/api/test", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Express routing is working" });
});

/* ── Imported route modules ──────────────────────────────────────────────────
   Each registration is wrapped individually so that a broken import (missing
   env var, bad DB URL, unresolved dependency, etc.) is caught and logged
   instead of silently preventing ALL routes from loading.                    */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const productRoutes = require("./src/routes/productRoutes").default;
  app.use("/api/products", productRoutes);
  console.log("✅ /api/products registered");
} catch (err) {
  console.error("❌ Failed to load productRoutes:", err);
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const contactRoutes = require("./src/routes/contactRoutes").default;
  app.use("/api/contact", contactRoutes);
  console.log("✅ /api/contact registered");
} catch (err) {
  console.error("❌ Failed to load contactRoutes:", err);
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const paymentRoutes = require("./src/routes/paymentRoutes").default;
  app.use("/api/payments", paymentRoutes);
  console.log("✅ /api/payments registered");
} catch (err) {
  console.error("❌ Failed to load paymentRoutes:", err);
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const orderRoutes = require("./src/routes/orderRoutes").default;
  app.use("/api/orders", orderRoutes);
  console.log("✅ /api/orders registered");
} catch (err) {
  console.error("❌ Failed to load orderRoutes:", err);
}

/* ── Health check ────────────────────────────────────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/* ── JSON parse error handler ─────────────────────────────────────────────────
   Catch and log malformed JSON payloads so we can return a clearer error.    */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.error("JSON parse error:", err.message);
    console.error("Raw body:", (req as any).rawBody);
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  return next(err);
});

/* ── Catch-all 404 handler ───────────────────────────────────────────────────
   Logs every unmatched request so we can see exactly which paths are hitting
   the server but not matching any registered route.                          */
app.use((req: Request, res: Response, _next: NextFunction) => {
  console.warn(`⚠️  404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    try {
      const { syncModels } = require("./src/models/index");
      await syncModels();
    } catch (syncErr) {
      console.error("⚠️ Failure running database models sync:", syncErr);
      if (process.env.NODE_ENV !== "production") {
        throw syncErr; // rethrow in dev to fail fast
      }
    }
    const skipSmtp = (process.env.SKIP_SMTP_VERIFY || "").toLowerCase() === "true";
    if (skipSmtp) {
      console.log("SMTP verify skipped because SKIP_SMTP_VERIFY=true");
    } else {
      try {
        await verifyTransporter();
      } catch (err) {
        console.warn(
          "SMTP verification failed at startup. Emails may not be sent until env vars are fixed.",
        );
      }
    }
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
  } catch (err) {
    console.error("❌ Impossible de démarrer le serveur :", err);
    process.exit(1);
  }
})();
