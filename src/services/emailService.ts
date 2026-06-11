import fs from "fs";
import path from "path";
import util from "util";
import { Resend } from "resend";

const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const exists = util.promisify(fs.exists);

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RESEND_FROM || "Williams Mobil <contact@williamsmobilhome.com>";
const SKIP_EMAIL_SEND = process.env.SKIP_EMAIL_SEND === "true";
const TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS || 15000);
const RETRY_ATTEMPTS = Number(process.env.RESEND_RETRY_ATTEMPTS || 2);

if (!RESEND_API_KEY && !SKIP_EMAIL_SEND) {
  console.warn("⚠️ RESEND_API_KEY not set — email sending disabled unless SKIP_EMAIL_SEND=true");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const anyError = error as { message?: unknown };
    if (typeof anyError.message === "string") return anyError.message;
  }
  return String(error);
}

type OrderItem = {
  id?: string;
  name: string;
  quantity?: number;
  unit_price?: number;
};

type Order = {
  id: string;
  total: number;
  currency?: string;
  customerName?: string;
  items?: OrderItem[];
  createdAt?: string;
  [key: string]: any;
};

type SendOptions = {
  to: string;
  subject: string;
  html: string;
  attachments?: { name: string; data: string; type?: string }[]; // data = base64
  text?: string;
  cc?: string | string[];
};

/**
 * Generic send via Resend with retries and fallback.
 */
async function sendWithResend(opts: SendOptions): Promise<void> {
  if (SKIP_EMAIL_SEND) {
    console.info("SKIP_EMAIL_SEND=true — logging email instead of sending", { to: opts.to, subject: opts.subject });
    return;
  }

  if (!resend) {
    throw new Error("Resend client not initialized (missing RESEND_API_KEY)");
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= RETRY_ATTEMPTS) {
    try {
      attempt++;
      console.info(`Email send attempt ${attempt} -> ${opts.to} / ${opts.subject}`);

      const payload: any = {
        from: FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      };

      if (opts.cc) {
        payload.cc = opts.cc;
      }

      if (opts.attachments && opts.attachments.length) {
        // Resend expects attachment data as base64 strings
        payload.attachments = opts.attachments.map((a) => ({
          name: a.name,
          data: a.data,
          type: a.type || "application/octet-stream",
        }));
      }

      // Timeout wrapper
      const sendPromise = resend.emails.send(payload);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Resend send timeout")), TIMEOUT_MS),
      );

      await Promise.race([sendPromise, timeoutPromise]);
      console.info("✅ Email sent via Resend", { to: opts.to, subject: opts.subject });
      return;
    } catch (err: unknown) {
      lastError = err;
      console.error(`Resend send failed (attempt ${attempt}):`, getErrorMessage(err));
      if (attempt <= RETRY_ATTEMPTS) {
        const backoff = 500 * attempt;
        await new Promise((res) => setTimeout(res, backoff));
      }
    }
  }

  // Fallback: persist failed email to disk for later retry + optional SMTP fallback
  try {
    await persistFailedEmail(opts, lastError);
    await trySmtpFallback(opts, lastError);
  } catch (fallbackErr: unknown) {
    console.error("Fallback failed:", getErrorMessage(fallbackErr));
  }

  throw new Error(`Email send failed after ${RETRY_ATTEMPTS + 1} attempts: ${getErrorMessage(lastError)}`);
}

/**
 * Persist failed email locally for later replay/inspection
 */
async function persistFailedEmail(opts: SendOptions, error: any) {
  try {
    const dir = path.join(process.cwd(), "tmp", "failed-emails");
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
    const filename = `failed-${Date.now()}.json`;
    const full = path.join(dir, filename);
    const payload = {
      createdAt: new Date().toISOString(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map((a) => ({ name: a.name, type: a.type })) || [],
      error: String(error?.message || error),
    };
    await writeFile(full, JSON.stringify(payload, null, 2), "utf8");
    console.info("Saved failed email to", full);
} catch (err: unknown) {
    console.error("Could not persist failed email:", getErrorMessage(err));
  }
}

/**
 * Optional SMTP fallback using Nodemailer, only if SMTP env vars are present.
 * This preserves a safe fallback path when Resend is unavailable.
 */
async function trySmtpFallback(opts: SendOptions, originalError: any) {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_SECURE = process.env.SMTP_SECURE === "true";

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.info("SMTP fallback skipped — SMTP credentials not configured.");
    return;
  }

  try {
    // Dynamic import to avoid adding dependency if not used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const mailOptions: any = {
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map((a) => ({
        filename: a.name,
        content: Buffer.from(a.data, "base64"),
        contentType: a.type,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    console.info("✅ Email sent via SMTP fallback:", info?.messageId || info);
  } catch (err: unknown) {
    console.error("SMTP fallback failed:", getErrorMessage(err));
    throw err;
  }
}

/**
 * Small HTML templates — keep structure but simple to maintain.
 */
function orderConfirmationHtml(order: Order): string {
  const itemsHtml =
    order.items?.map((it) => `<li>${escapeHtml(it.name)} x ${it.quantity ?? 1} — ${it.unit_price ?? ""}</li>`).join("") ||
    "";
  return `
    <html>
      <body>
        <h2>Merci pour votre commande — #${escapeHtml(order.id)}</h2>
        <p>Bonjour ${escapeHtml(order.customerName || "")},</p>
        <p>Nous confirmons la réception de votre commande d'un montant de ${escapeHtml(String(order.total))} ${escapeHtml(order.currency || "")}.</p>
        <ul>${itemsHtml}</ul>
        <p>Pièce jointe : votre facture PDF.</p>
        <p>— Williams Mobil</p>
      </body>
    </html>
  `;
}

function paymentFailureHtml(orderId: string, reason?: string): string {
  return `
    <html>
      <body>
        <h2>Échec de paiement — commande #${escapeHtml(orderId)}</h2>
        <p>Nous n'avons pas pu traiter le paiement${reason ? ` : ${escapeHtml(reason)}` : "."}</p>
        <p>Merci de vérifier les informations de paiement ou de contacter le support.</p>
        <p>— Williams Mobil</p>
      </body>
    </html>
  `;
}

function contactReceivedHtml(name: string, message: string, phone?: string) {
  return `
  <html><body>
  <h2>Nouveau message de contact</h2>
  <p><strong>Nom:</strong> ${escapeHtml(name)}</p>
  <p><strong>Téléphone:</strong> ${escapeHtml(phone || "-")}</p>
  <p><strong>Message:</strong></p>
  <div>${escapeHtml(message).replace(/\n/g, "<br/>")}</div>
  </body></html>
  `;
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Public API
 */

/**
 * Send order confirmation with optional PDF invoice buffer.
 * - `pdfBuffer` should be a Buffer of the PDF (already generated by invoiceService).
 */
export async function sendOrderConfirmationEmail(to: string, order: Order, pdfBuffer?: Buffer): Promise<void> {
  const subject = `Confirmation de commande #${order.id}`;
  const html = orderConfirmationHtml(order);

  const attachments = pdfBuffer
    ? [
        {
          name: `invoice-${order.id}.pdf`,
          data: pdfBuffer.toString("base64"),
          type: "application/pdf",
        },
      ]
    : undefined;

  await sendWithResend({ to, subject, html, attachments });
}

/**
 * Send payment failure notification to customer.
 */
export async function sendPaymentFailureEmail(to: string, orderId: string, reason?: string): Promise<void> {
  const subject = `Échec de paiement — commande #${orderId}`;
  const html = paymentFailureHtml(orderId, reason);
  await sendWithResend({ to, subject, html });
}

function getProfessionalRecipient(): string {
  return process.env.ADMIN_EMAIL || FROM_EMAIL;
}

function paymentProofHtml(payerEmail: string, details: string): string {
  return `
    <html>
      <body>
        <h2>Nouvelle preuve de paiement reçue</h2>
        <p><strong>Email client :</strong> ${escapeHtml(payerEmail)}</p>
        <p><strong>Détails :</strong></p>
        <pre>${escapeHtml(details)}</pre>
      </body>
    </html>
  `;
}

function orderValidationHtml(order: Order, trackingCode: string): string {
  return `
    <html>
      <body>
        <h2>Votre paiement a été validé</h2>
        <p>Bonjour ${escapeHtml(order.customerName || "")},</p>
        <p>Votre commande <strong>#${escapeHtml(order.id)}</strong> a bien été validée.</p>
        <p><strong>Code de suivi :</strong> ${escapeHtml(trackingCode)}</p>
        <p><strong>Montant :</strong> ${escapeHtml(String(order.total))} ${escapeHtml(order.currency || "")}</p>
        <p>Adresse : ${escapeHtml(order.customerAddress || "")}, ${escapeHtml(order.customerCity || "")}</p>
        <p>Merci pour votre confiance.</p>
      </body>
    </html>
  `;
}

export async function sendPaymentProofEmail(
  payerEmail: string,
  details: string,
  file?: { originalname?: string; buffer?: Buffer; mimetype?: string },
): Promise<void> {
  const to = getProfessionalRecipient();
  const subject = `Nouvelle preuve de paiement reçue`;
  const html = paymentProofHtml(payerEmail, details);
  const text = `Email client: ${payerEmail}\nDétails:\n${details}`;

  const attachments = file?.buffer
    ? [
        {
          name: file.originalname || "payment-proof",
          data: file.buffer.toString("base64"),
          type: file.mimetype || "application/octet-stream",
        },
      ]
    : undefined;

  await sendWithResend({ to, subject, html, text, attachments });
}

export async function sendOrderValidationEmail(order: Order, trackingCode: string): Promise<void> {
  const to = order.customerEmail || FROM_EMAIL;
  const professionalRecipient = getProfessionalRecipient();
  const subject = `Paiement validé - commande #${order.id}`;
  const html = orderValidationHtml(order, trackingCode);
  const text = `Bonjour ${order.customerName || ""},\nVotre commande #${order.id} a été validée. Code de suivi: ${trackingCode}`;

  await sendWithResend({
    to,
    cc: professionalRecipient,
    subject,
    html,
    text,
  });
}

export async function sendNewOrderAdminEmail(
  order: Order,
  paymentMethod: string,
  items: any[]
): Promise<void> {
  const to = getProfessionalRecipient();
  const subject = `Nouvelle commande reçue #${order.id}`;

  const itemsListHtml = items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong> (x${item.quantity}) - €${(
          Number(item.price || item.unit_price) * (item.quantity || 1)
        ).toFixed(2)}</li>`
    )
    .join("");

  const html = `
    <html>
      <body>
        <h2>Nouvelle commande reçue — #${escapeHtml(order.id)}</h2>
        <p>Une nouvelle commande a été passée sur le site.</p>
        
        <h3>Informations client :</h3>
        <ul>
          <li><strong>Nom complet :</strong> ${escapeHtml(order.customerName || "")}</li>
          <li><strong>Adresse e-mail :</strong> ${escapeHtml(order.customerEmail || "")}</li>
          <li><strong>Téléphone :</strong> ${escapeHtml(order.customerPhone || "")}</li>
          <li><strong>Adresse de livraison :</strong> ${escapeHtml(order.customerAddress || "")}</li>
          <li><strong>Ville :</strong> ${escapeHtml(order.customerCity || "")}</li>
          <li><strong>Code postal :</strong> ${escapeHtml(order.customerPostalCode || "")}</li>
        </ul>

        <h3>Détails du paiement :</h3>
        <ul>
          <li><strong>Mode de paiement :</strong> ${escapeHtml(paymentMethod)}</li>
          <li><strong>Montant Total :</strong> €${Number(order.total).toFixed(2)}</li>
        </ul>

        <h3>Produits commandés :</h3>
        <ul>
          ${itemsListHtml}
        </ul>
      </body>
    </html>
  `;

  const text = `
    Nouvelle commande #${order.id}
    Client: ${order.customerName}
    Email: ${order.customerEmail}
    Téléphone: ${order.customerPhone}
    Adresse: ${order.customerAddress}, ${order.customerCity} (${order.customerPostalCode})
    Mode de paiement: ${paymentMethod}
    Montant total: €${order.total}
  `;

  await sendWithResend({ to, subject, html, text });
}

/**
 * Send contact form email to site owner
 */
export async function sendContactEmail(name: string, email: string, subject: string, message: string, phone?: string) {
  const to = FROM_EMAIL; // site owner
  const html = contactReceivedHtml(name, `${message}\n\nEmail: ${email}`, phone);
  await sendWithResend({ to, subject: subject || `Contact - ${name}`, html });
}

/**
 * Health helper to test email connectivity quickly (for monitoring).
 */
export async function verifyTransporter(): Promise<void> {
  const result = await emailHealthCheck();
  if (!result.ok) {
    throw new Error(result.detail || "Failed to verify email provider");
  }
}

export async function emailHealthCheck(): Promise<{ ok: boolean; detail?: string }> {
  if (SKIP_EMAIL_SEND) return { ok: true, detail: "skip" };
  if (!resend) return { ok: false, detail: "RESEND_API_KEY missing" };

  try {
    // minimal no-op send test: send to FROM_EMAIL with test subject but don't retry on fail
    await resend.emails.send({
      from: FROM_EMAIL,
      to: FROM_EMAIL,
      subject: `Health check ${Date.now()}`,
      html: "<div>Health check</div>",
    });
    return { ok: true };
  } catch (err: unknown) {
    console.error("Email health check failed:", getErrorMessage(err));
    return { ok: false, detail: getErrorMessage(err) };
  }
}
