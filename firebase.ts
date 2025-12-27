
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Standardized named import for getDatabase from firebase/database module
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjGFyEpUMHgt7NLctuhAekK6QyhrdNx4w",
  authDomain: "campus-resource-sharing2.firebaseapp.com",
  databaseURL: "https://campus-resource-sharing2-default-rtdb.firebaseio.com",
  projectId: "campus-resource-sharing2",
  storageBucket: "campus-resource-sharing2.firebasestorage.app",
  messagingSenderId: "510875130674",
  appId: "1:510875130674:web:234f3899748b22aa6d152b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
