const { onRequest } = require("firebase-functions/v2/https");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const express = require("express");

const telegramBotToken = defineString("TELEGRAM_BOT_TOKEN");
const CODE_EXPIRY_MS = 5 * 60 * 1000;

initializeApp();
const db = getFirestore();

async function sendTelegram(token, chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Telegram API: ${r.status} ${t}`);
  }
}

// Telefon raqamni 9 xonali qilib normallashtirish (+998901234567 -> 901234567)
function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return digits.slice(3);
  if (digits.length === 9) return digits;
  return digits.slice(-9);
}

async function handleTelegramUpdate(req, res) {
  const token = telegramBotToken.value();
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN bo'sh");
    return res.status(500).send("Bot sozlanmagan");
  }
  const body = req.body || {};
  const message = body.message;
  if (!message || message.chat?.id == null) {
    return res.status(200).send("OK");
  }
  const chatId = message.chat.id;

  try {
    // 1) Foydalanuvchi "Raqamni yuborish" tugmasi orqali contact yubordi
    if (message.contact?.phone_number) {
      const raw = message.contact.phone_number;
      const phone = normalizePhone(raw);
      if (phone.length !== 9) {
        await sendTelegram(
          token,
          chatId,
          "Iltimos, O'zbekiston telefon raqamingizni yuboring (+998...)."
        );
        return res.status(200).send("OK");
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await db.collection("telegram_verifications").doc(phone).set({
        code,
        telegramId: chatId,
        createdAt: Date.now(),
        used: false,
      });
      await sendTelegram(
        token,
        chatId,
        `✅ Tasdiqlash kodingiz: ${code}\n\nUni saytdagi maydonga kiriting. Kod 5 daqiqa amal qiladi.`
      );
      return res.status(200).send("OK");
    }

    // 2) Matn xabar (masalan /start)
    const rawText = (message.text || "").trim();
    if (rawText === "/start" || rawText.startsWith("/start ")) {
      const replyMarkup = {
        keyboard: [[{ text: "📱 Raqamingizni yuborish", request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      };
      await sendTelegram(
        token,
        chatId,
        "👋 Registon ro'yxatdan o'tish boti.\n\nDars band qilish uchun quyidagi tugmani bosing va Telegram orqali telefon raqamingizni yuboring. Keyin sizga tasdiqlash kodi yuboriladi — uni saytda kiriting.",
        replyMarkup
      );
      return res.status(200).send("OK");
    }

    // Boshqa matn: yana contact so'rash
    const replyMarkup = {
      keyboard: [[{ text: "📱 Raqamingizni yuborish", request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
    };
    await sendTelegram(
      token,
      chatId,
      "Iltimos, quyidagi tugmani bosing va raqamingizni yuboring (matn emas, «Raqamingizni yuborish» tugmasi orqali).",
      replyMarkup
    );
    return res.status(200).send("OK");
  } catch (err) {
    console.error("telegramWebhook xato:", err);
    return res.status(200).send("OK");
  }
}

const telegramApp = express();
telegramApp.use(express.json({ limit: "256kb" }));
telegramApp.post("/", handleTelegramUpdate);
telegramApp.post("*", handleTelegramUpdate);
telegramApp.get("/", (req, res) => res.status(200).send("OK"));

exports.telegramWebhook = onRequest(
  {
    region: "us-central1",
    invoker: "public",
  },
  telegramApp
);

exports.verifyTelegramCode = onCall(
  { region: "us-central1" },
  async (request) => {
    const { phone, code } = request.data || {};
    const cleanPhone = String(phone || "").replace(/\D/g, "");
    const cleanCode = String(code || "").trim();
    if (cleanPhone.length !== 9 || cleanCode.length !== 6) {
      throw new HttpsError("invalid-argument", "Telefon yoki kod formati xato.");
    }
    const ref = db.collection("telegram_verifications").doc(cleanPhone);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError(
        "not-found",
        "Ushbu raqam uchun kod yuborilmagan. Avval Telegram botga raqamingizni yuboring."
      );
    }
    const data = snap.data();
    if (data.used) {
      throw new HttpsError("failed-precondition", "Bu kod allaqachon ishlatilgan.");
    }
    if (Date.now() - (data.createdAt || 0) > CODE_EXPIRY_MS) {
      throw new HttpsError("failed-precondition", "Kod muddati tugagan. Botga qayta raqam yuboring.");
    }
    if (data.code !== cleanCode) {
      throw new HttpsError("invalid-argument", "Kod noto'g'ri.");
    }
    await ref.update({ used: true });
    return { success: true };
  }
);
