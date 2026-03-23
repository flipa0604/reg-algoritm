# Telegram bot sozlash (Ro'yxatdan o'tish tasdiqlashi)

**Bot:** Registon Registration — [@registonbandbot](https://t.me/registonbandbot)

## 1. Token qayerda

Token **`functions/.env`** faylida saqlanadi (git ga yuklanmaydi):

```
TELEGRAM_BOT_TOKEN=8688966824:AAG-...
```

Yangi token kerak bo'lsa: `functions/.env` ni tahrirlang yoki `functions/.env.example` dan nusxa olib to'ldiring.

## 2. Firebase da qo'lda biror narsa qilish kerakmi?

**Yo'q.** Token `functions/.env` da bo'lsa, `firebase deploy --only functions` paytida Firebase CLI bu qiymatni o'qiydi va funksiyaga ulanadi. Firebase Console da alohida token kiritish shart emas.

Agar `.env` bo'lmasa yoki token bo'sh bo'lsa, deploy paytida CLI sizdan `TELEGRAM_BOT_TOKEN` so'raydi va javobni saqlashi mumkin.

## 3. Deploy va webhook

1. Funksiyalarni deploy qiling:
   ```bash
   cd d:\Projects\registon-web
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

2. Deploy tugagach, **webhook** o'rnating (Telegram serveriga "xabarlarni qayerga yuborish"ni aytish):
   - Loyiha ID: `registon-web` bo'lsa, URL:
     ```
     https://us-central1-registon-web.cloudfunctions.net/telegramWebhook
     ```
   - Brauzerda oching yoki terminalda (BOT_TOKEN o'rniga `functions/.env` dagi tokenni qo'ying):
     ```bash
     curl "https://api.telegram.org/bot8688966824:AAG-ATgI1nA1hm9DYH6TYRrLPC2gnbvX2x0/setWebhook?url=https://us-central1-registon-web.cloudfunctions.net/telegramWebhook"
     ```
   - Javobda `"ok":true` chiqsa, webhook ishlayapti.

## 4. Oqim

1. O'quvchi saytda telefon raqamini kiritadi (9 ta raqam).
2. "Telegram orqali tasdiqlang" da [@registonbandbot](https://t.me/registonbandbot) ga boring va shu raqamni yuboring.
3. Bot 6 xonali kod yuboradi.
4. Kodni saytga kiritib "Tasdiqlash" bosiladi.
5. Keyin ism, guruh va parol kiritib bron qiladi.
