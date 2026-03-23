import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBYkmtSmUlMt-QNDT4ioLQk3e7Bma3PC2E",
  authDomain: "registon-web.firebaseapp.com",
  projectId: "registon-web",
  storageBucket: "registon-web.firebasestorage.app",
  messagingSenderId: "418218039779",
  appId: "1:418218039779:web:445fce5c1d3a1957c568d6",
  measurementId: "G-XEWBP1DWRD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const functions = getFunctions(app, "us-central1");
// Mahalliy test uchun: connectFunctionsEmulator(functions, "127.0.0.1", 5001);
export { functions };