import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || "https://mixfood.in.ua";

/** Security / middleware */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("combined"));
app.use(express.json({ limit: "200kb" }));
app.use(cors({ origin: allowedOrigin, methods: ["POST", "GET"] }));

/** Rate limit для /api/contact */
const limiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use("/api/contact", limiter);

/** Валидация */
const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10).max(5000),
  _hp: z.string().optional(), // honeypot
});

/** SMTP (Gmail с App Password) */
function makeTransport() {
  const { MAIL_USER, MAIL_APP_PASS } = process.env;
  if (!MAIL_USER || !MAIL_APP_PASS) {
    throw new Error("MAIL_USER/MAIL_APP_PASS not configured");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_APP_PASS },
  });
}

/** API health */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** Приём формы */
app.post("/api/contact", async (req, res) => {
  try {
    const data = ContactSchema.parse(req.body);
    if (data._hp && data._hp.trim() !== "") {
      return res.json({ ok: true }); // тихо игнорим ботов
    }
    const transporter = makeTransport();
    const to = process.env.MAIL_TO || process.env.MAIL_USER;

    await transporter.sendMail({
      from: `"MixFood Site" <${process.env.MAIL_USER}>`,
      to,
      replyTo: data.email,
      subject: `Заявка з сайту: ${data.name}`,
      text: [
        `Ім'я: ${data.name}`,
        `Email: ${data.email}`,
        data.phone ? `Телефон: ${data.phone}` : null,
        "",
        `Повідомлення:`,
        data.message,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    res.json({ ok: true });
  } catch (err) {
    if (err?.issues) {
      return res
        .status(400)
        .json({ ok: false, error: "validation_error", details: err.issues });
    }
    console.error("MAIL ERROR", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://127.0.0.1:${PORT}`);
});
