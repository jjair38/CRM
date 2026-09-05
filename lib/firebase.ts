import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  projectId: "gen-lang-client-0681293134",
  appId: "1:15335194180:web:ebc76e43eca816c9c30611",
  apiKey: "AIzaSyAXBgMvLJwY7NjW82XxfsGpSsmvNwtdLK4",
  authDomain: "gen-lang-client-0681293134.firebaseapp.com",
  storageBucket: "gen-lang-client-0681293134.firebasestorage.app",
  messagingSenderId: "15335194180",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Habilitar persistência offline se estiver no navegador
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistência falhou: múltiplas abas abertas.');
    } else if (err.code === 'unimplemented') {
      console.warn('O navegador não suporta persistência.');
    }
  });
}

export { db, auth, googleProvider };
