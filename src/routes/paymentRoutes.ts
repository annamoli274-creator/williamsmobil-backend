import { Router } from "express";
import multer from "multer";
import { sendPaymentProofEmail } from "../services/emailService";

const router = Router();

// Configuration de multer pour stocker le fichier en mémoire
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/proof", upload.single("proofImage"), async (req, res) => {
  try {
    const { userId, details } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "L'image de la preuve de paiement est requise." });
    }

    if (!userId || !details) {
      return res.status(400).json({ error: "Les champs userId et details sont requis." });
    }

    await sendPaymentProofEmail(userId, details, file);

    res.status(200).json({ message: "La preuve de paiement a été envoyée avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'envoi de la preuve de paiement:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'envoi de la preuve." });
  }
});

export default router;
