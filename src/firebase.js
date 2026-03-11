import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCzkIdJqYmr4_NlVg3iZjB8TK8mM5ljDu4",
  authDomain: "simulearnt.firebaseapp.com",
  projectId: "simulearnt",
  storageBucket: "simulearnt.firebasestorage.app",
  messagingSenderId: "493681955651",
  appId: "1:493681955651:web:c12c41a6ead64c18f255f6",
  measurementId: "G-RTRVPV8LSR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();