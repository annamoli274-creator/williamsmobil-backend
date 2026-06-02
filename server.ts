import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import productRoutes from "./src/routes/productRoutes"; // import relatif corrigé (ou "@/routes/productRoutes.ts")
import contactRoutes from "./src/routes/contactRoutes";
import paymentRoutes from "./src/routes/paymentRoutes";
import { syncModels } from "./src/models/index";
import orderRoutes from "./src/routes/orderRoutes";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

/* API routes */
app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);

/* health‑check */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    if (process.env.NODE_ENV !== "production") {
      await syncModels(); // uniquement en dev
    }
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
  } catch (err) {
    console.error("❌ Impossible de démarrer le serveur :", err);
    process.exit(1);
  }
})();
