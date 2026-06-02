import { Router } from "express";
import { sendContactEmail } from "../services/emailService";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    await sendContactEmail(name, email, subject, message, phone);

    res.status(200).json({ message: "Votre message a été envoyé avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message de contact:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'envoi du message." });
  }
});

export default router;
