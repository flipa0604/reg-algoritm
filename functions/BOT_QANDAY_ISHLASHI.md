# Telegram bot qayerda va qanday ishlaydi?

## Alohida "bot server" dasturi yo'q

Botning barcha logikasi **Firebase Cloud Function** ichida. Alohida server (VPS, Node.js da doim ishlab turadigan dastur) yozish shart emas.

---

## Oqim

```
[Foydalanuvchi]  →  Telegram  →  Webhook URL  →  Cloud Function (telegramWebhook)
       ↑                                                      |
       |                                                      | sendMessage
       |                                                      ↓
       └──────────────  Bot javob yuboradi  ←──────  Telegram API
```

1. Foydalanuvchi @registonbandbot ga xabar yozadi (masalan: 901234567).
2. Telegram bu xabarni **webhook URL** ga POST qiladi:  
   `https://us-central1-registon-web.cloudfunctions.net/telegramWebhook`
3. **Cloud Function `telegramWebhook`** ishga tushadi (bu — bizning "server" kodimiz).
4. Funksiya xabarni o‘qiydi, kod yaratadi, Firestore ga yozadi, Telegram API orqali javob yuboradi.
5. Foydalanuvchi bot orqali javobni ko‘radi.

---

## "Server" kodi qayerda?

| Fayl | Rol |
|------|-----|
| `functions/index.js` | **Yagona server kodi.** `telegramWebhook` — xabarni qabul qiladi va bot orqali javob yuboradi. |
| `functions/.env` | Bot token (serverda ishlatiladi). |

Bot ishlashi uchun **faqat** `firebase deploy --only functions` qilish yetadi. Boshqa hech qanday dastur "run" qilish shart emas.
