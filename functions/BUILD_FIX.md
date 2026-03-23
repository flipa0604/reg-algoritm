# "Missing permission on the build service account" xatosini tuzatish

Loyiha: **registon-web**  
Project number: **418218039779**

Cloud Build service account ga quyidagi ruxsatlarni qo'shing.

---

## Usul 1: Google Cloud Console orqali (oson)

1. **IAM sahifasini oching:**  
   https://console.cloud.google.com/iam-admin/iam?project=registon-web  

2. **"GRANT ACCESS"** (yoki "Ruxsat berish") tugmasini bosing.

3. **"New principals"** maydoniga yozing:
   ```
   418218039779@cloudbuild.gserviceaccount.com
   ```

4. **"Role"** dan quyidagilarni qo'shing (har biri uchun alohida "Add another role" bo‘lishi mumkin):
   - **Cloud Run Admin**
   - **Service Account User**
   - **Artifact Registry Writer** (yoki **Storage Admin** — agar Artifact Registry bo‘lmasa)

5. **Save** bosing.

6. Terminalda qayta deploy qiling:
   ```powershell
   firebase deploy --only functions
   ```

---

## Usul 2: gcloud orqali (agar o‘rnatilgan bo‘lsa)

PowerShell da:

```powershell
$PROJECT_ID = "registon-web"
$PROJECT_NUMBER = "418218039779"
$CB_SA = "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Cloud Run va deploy uchun
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CB_SA" --role="roles/run.admin"

# Service account sifatida ishlash uchun
gcloud iam service-accounts add-iam-policy-binding "${PROJECT_NUMBER}@appspot.gserviceaccount.com" --project=$PROJECT_ID --member="serviceAccount:$CB_SA" --role="roles/iam.serviceAccountUser"

# Artifact Registry (image saqlash uchun)
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$CB_SA" --role="roles/artifactregistry.writer"
```

Keyin:

```powershell
firebase deploy --only functions
```
