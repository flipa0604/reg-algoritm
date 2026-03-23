import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID,
} = import.meta.env;

const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
  measurementId: VITE_FIREBASE_MEASUREMENT_ID,
};

if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_PROJECT_ID) {
  throw new Error(
    "Firebase: .env faylida VITE_FIREBASE_* o‘zgaruvchilari yo‘q. .env.example ni nusxalab .env yarating."
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const functions = getFunctions(app, "us-central1");
// Mahalliy test: import { connectFunctionsEmulator } from "firebase/functions"; connectFunctionsEmulator(functions, "127.0.0.1", 5001);
export { functions };
