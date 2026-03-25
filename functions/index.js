const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

/** Telegram webhook va verifyTelegramCode olib tashlandi — o'quvchilar telefonni saytda tasdiqlamaydi. */
exports.health = onRequest(
  { region: "us-central1", invoker: "public" },
  (req, res) => {
    res.status(200).send("OK");
  }
);
