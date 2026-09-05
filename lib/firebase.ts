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

// Usando o ID do banco de dados oficial para garantir que os dados subam para a nuvem
const db = getFirestore(app, "ai-studio-controlefinancei-e9a5d49e-f898-475f-a5c2-5fc1fd40b72f");
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
