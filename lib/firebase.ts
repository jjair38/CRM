import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, disableNetwork, enableNetwork } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Inicializa o app com a configuração oficial
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: O app precisa ser inicializado corretamente para persistir na nuvem
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

// Removida a persistência offline para forçar a sincronização direta com a nuvem.
// Isso garante que se o dado não subir, o erro aparecerá imediatamente,
// evitando que as informações fiquem "presas" apenas no histórico do navegador.

export { db, auth, googleProvider };
