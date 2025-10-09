import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_APP_PASS },
});

console.log("testing deploy");

app.post("/api/contact", async (req, res) => {
  const { name, email, message, phone } = req.body || {};
  try {
    await transporter.sendMail({
      from: `"MixFood Site" <${process.env.MAIL_USER}>`, // ДОЛЖЕН быть = MAIL_USER
      to: process.env.MAIL_TO || process.env.MAIL_USER,
      replyTo: email, // чтобы отвечать клиенту
      subject: `Заявка з сайту: ${name || "Без імені"}`,
      text: [
        `Ім'я: ${name || "-"}`,
        `Email: ${email || "-"}`,
        phone ? `Телефон: ${phone}` : null,
        "",
        "Повідомлення:",
        message || "-",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "mail_failed" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("API on http://127.0.0.1:" + (process.env.PORT || 3000))
);
