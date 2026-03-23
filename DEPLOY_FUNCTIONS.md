# Firebase Functions deploy qilish

## 1. Firebase ga kirish
Terminalda:
```powershell
firebase login
```
Brauzer ochiladi — Google hisobingiz bilan kiring.

## 2. Loyihani tanlash
```powershell
cd D:\Projects\registon-web
firebase use registon-web
```
Agar `registon-web` ro'yxatda bo'lmasa:
```powershell
firebase use --add
```
Keyin ro'yxatdan **registon-web** loyihasini tanlang va alias bering (masalan: `default`).

## 3. Funksiyalarni deploy qilish
```powershell
cd D:\Projects\registon-web
firebase deploy --only functions
```

Yoki loyiha nomini to'g'ridan-to'g'ri berish:
```powershell
firebase deploy --only functions --project registon-web
```

---

**Xato:** "No currently active project"  
**Yechim:** `firebase use registon-web` yoki `firebase use --add` qiling.

**Xato:** "Failed to authenticate"  
**Yechim:** `firebase login` qiling.
