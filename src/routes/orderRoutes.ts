import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import Order from "../models/Order";
import Cart from "../models/Cart";
import Payment from "../models/Payment";
import {
  sendOrderValidationEmail,
  sendPaymentProofEmail,
  sendNewOrderAdminEmail,
} from "../services/emailService";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .reduce<Record<string, string>>((acc, cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (!name) return acc;
      acc[name] = rest.join("=");
      return acc;
    }, {});
}

router.post("/", upload.single("proofFile"), async (req, res) => {
  try {
    const {
      fullName,
      address,
      city,
      postalCode,
      phone,
      email,
      paymentMethod,
      total,
      items,
      paypalEmail,
    } = req.body as Record<string, string>;

    if (
      !fullName ||
      !address ||
      !city ||
      !postalCode ||
      !phone ||
      !email ||
      !paymentMethod ||
      !total
    ) {
      return res
        .status(400)
        .json({ error: "Tous les champs requis ne sont pas fournis." });
    }

    const parsedTotal = Number.parseFloat(total);
    if (Number.isNaN(parsedTotal)) {
      return res.status(400).json({ error: "Total invalide." });
    }

    const cookies = parseCookies(req.headers.cookie);
    const cartToken = cookies["cart_token"] || crypto.randomUUID();

    let cart = await Cart.findOne({ where: { token: cartToken } });
    if (!cart) {
      cart = await Cart.create({ token: cartToken });
    }

    const order = await Order.create({
      cartId: cart.id,
      status: "pending",
      total: parsedTotal,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: address,
      customerCity: city,
      customerPostalCode: postalCode,
    });

    const payment = await Payment.create({
      orderId: order.id,
      amount: parsedTotal,
      method: paymentMethod,
      status: req.file ? "proof_uploaded" : "pending",
      providerResponse: paypalEmail ? { paypalEmail } : null,
      proofFilePath: req.file ? req.file.originalname : null,
    });

    let parsedItems = [];
    try {
      if (items) {
        parsedItems = JSON.parse(items);
      }
    } catch (e) {
      console.warn("Could not parse items for admin email", e);
    }

    try {
      await sendNewOrderAdminEmail(order, paymentMethod, parsedItems);
    } catch (mailError) {
      console.error(
        "Erreur lors de l'envoi de la notification de commande à l'admin :",
        mailError,
      );
    }

    if (req.file) {
      try {
        await sendPaymentProofEmail(
          email,
          `Méthode de paiement: ${paymentMethod}\nEmail de paiement: ${paypalEmail || email}\nCommande: ${order.id}`,
          req.file,
        );
      } catch (mailError) {
        console.error(
          "Erreur lors de l'envoi de la preuve de paiement au mail pro :",
          mailError,
        );
      }
    }

    return res.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      status: order.status,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la création de la commande." });
  }
});

router.get("/", async (req, res) => {
  try {
    const orderId = req.query.id as string | undefined;

    if (orderId) {
      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ error: "Commande introuvable" });
      }
      const payments = await Payment.findAll({ where: { orderId } });
      return res.json({ order, payments });
    }

    const orders = await Order.findAll({
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération des commandes." });
  }
});

/**
 * POST /api/orders/validate
 * Body : { orderId: string }
 * → Valide la commande, génère la facture PDF et envoie le mail.
 */
router.post("/validate", async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "orderId requis" });
  }

  try {
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    order.status = "validated";
    await order.save();

    const trackingCode = `WM-${order.id.slice(0, 8).toUpperCase()}`;
    await sendOrderValidationEmail(order, trackingCode);

    res.json({ message: "Commande validée, mail envoyé", trackingCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la validation" });
  }
});

export default router;
