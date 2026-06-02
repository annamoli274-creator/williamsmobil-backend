import nodemailer from "nodemailer";

// Build transporter with safer defaults and timeouts. Support STARTTLS (port 587)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecureEnv = (process.env.SMTP_SECURE || "").toLowerCase();
const smtpSecure = smtpSecureEnv === "true" || smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort || (smtpSecure ? 465 : 587),
  secure: smtpSecure,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  pool: true,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  requireTLS: !smtpSecure,
  tls: {
    // allow self-signed in some environments; set SMTP_TLS_REJECT_UNAUTHORIZED=false to disable
    rejectUnauthorized: (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true") === "true",
  },
});

export const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("SMTP transporter verified");
  } catch (err) {
    console.error("SMTP transporter verification failed:", err);
    throw err;
  }
};

type ProofAttachment = Express.Multer.File | { path: string; filename: string };

const getProfessionalRecipient = () => {
  const recipient = process.env.PROFESSIONAL_EMAIL || process.env.SMTP_USER;
  if (!recipient) {
    throw new Error("Aucun destinataire défini pour l'envoi d'email (PROFESSIONAL_EMAIL ou SMTP_USER manquant)");
  }
  return recipient;
};

export const sendContactEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string,
  phone?: string,
) => {
  const recipient = getProfessionalRecipient();

  const mailOptions = {
    from: `"Site Web" <${process.env.SMTP_USER}>`,
    to: recipient,
    replyTo: email,
    subject: `📩 Nouveau message: ${subject}`,
    text: `Nom: ${name}\nEmail: ${email}\nTéléphone: ${phone || "Non fourni"}\nSujet: ${subject}\n\nMessage:\n${message}`,
    html: `
      <h2>Nouveau message de contact</h2>
      <p><strong>Nom:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Téléphone:</strong> ${phone || "Non fourni"}</p>
      <p><strong>Sujet:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de contact envoyé à ${recipient} de la part de ${email}`);
  } catch (err) {
    console.error("Erreur sendContactEmail:", err);
    throw err;
  }
};

export const sendPaymentProofEmail = async (
  payerEmail: string,
  details: string,
  file?: ProofAttachment,
) => {
  const recipient = getProfessionalRecipient();

  const attachments = [] as Array<{ filename: string; content?: Buffer; path?: string }>;
  if (file) {
    if ("buffer" in file) {
      attachments.push({ filename: file.originalname, content: file.buffer });
    } else if (file.path) {
      attachments.push({ filename: file.filename, path: file.path });
    }
  }

  const mailOptions = {
    from: `"Site Web" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `📩 Nouvelle preuve de paiement reçue`,
    text: `Email client: ${payerEmail}\nDétails: ${details}`,
    html: `
      <h2>Nouvelle preuve de paiement</h2>
      <p><strong>Email client :</strong> ${payerEmail}</p>
      <p><strong>Détails :</strong> ${details}</p>
    `,
    attachments: attachments.length ? attachments : undefined,
  };

  await transporter.sendMail(mailOptions);
};

export const sendOrderValidationEmail = async (
  order: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    customerPostalCode: string;
    total: number;
    status: string;
  },
  trackingCode: string,
) => {
  const professionalRecipient = getProfessionalRecipient();

  const mailOptions = {
    from: `"Site Web" <${process.env.SMTP_USER}>`,
    to: order.customerEmail,
    cc: professionalRecipient,
    subject: `✅ Paiement validé - Suivi ${trackingCode}`,
    text: `Bonjour ${order.customerName},\n\nVotre paiement a été validé.\nCode de suivi: ${trackingCode}\nCommande: ${order.id}\nMontant: ${order.total} €\n\nMerci pour votre confiance.`,
    html: `
      <h2>Votre paiement a été validé</h2>
      <p>Bonjour ${order.customerName},</p>
      <p>Votre paiement a bien été validé.</p>
      <p><strong>Code de suivi :</strong> ${trackingCode}</p>
      <p><strong>Commande :</strong> ${order.id}</p>
      <p><strong>Montant :</strong> ${order.total} €</p>
      <p><strong>Adresse :</strong> ${order.customerAddress}, ${order.customerCity}, ${order.customerPostalCode}</p>
      <p>Merci pour votre confiance.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
