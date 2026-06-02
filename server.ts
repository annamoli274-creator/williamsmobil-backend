import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

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
    // syncModels is intentionally skipped in production to avoid blocking
    // startup on a DB connection that may not be ready yet.
    if (process.env.NODE_ENV !== "production") {
      const { syncModels } = require("./src/models/index");
      await syncModels();
    }
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
  } catch (err) {
    console.error("❌ Impossible de démarrer le serveur :", err);
    process.exit(1);
  }
})();
