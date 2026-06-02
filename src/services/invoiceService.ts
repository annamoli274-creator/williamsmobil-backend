import PDFDocument from "pdfkit";
import Order from "../models/Order";

/**
 * Génère un PDF de facture à partir d'une commande.
 * Retourne le PDF sous forme de Buffer (prêt à être joint à un e‑mail).
 */
export const generateInvoicePdf = async (order: Order): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header
    doc
      .fontSize(20)
      .text("Facture", { align: "center" })
      .moveDown();

    // Client info
    doc
      .fontSize(12)
      .text(`Client : ${order.customerName}`)
      .text(`Email  : ${order.customerEmail}`)
      .text(`Téléphone : ${order.customerPhone}`)
      .moveDown();

    // Order details
    doc.fontSize(14).text("Détails de la commande", { underline: true });
    doc
      .fontSize(12)
      .text(`Référence : ${order.id}`)
      .text(`Statut    : ${order.status}`)
      .text(`Total TTC : ${order.total.toFixed(2)} €`)
      .moveDown();

    // Footer
    doc
      .fontSize(10)
      .text(
        "Merci de votre confiance!\nWilliams Mobilhome – contact@williamsmobilhome.com",
        { align: "center" },
      );

    doc.end();
  });
};
