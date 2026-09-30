import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAwoxxvFuw81ht6dHmVhioa8OM2MY-yUP4",
  authDomain: "nutrivo-54be2.firebaseapp.com",
  projectId: "nutrivo-54be2",
  storageBucket: "nutrivo-54be2.firebasestorage.app",
  messagingSenderId: "223826487377",
  appId: "1:223826487377:web:769336798078c347b37070",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };

