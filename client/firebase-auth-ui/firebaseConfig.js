// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCALm8ytZNwP39sRdFyhE-M8FM6IKEee7g",
  authDomain: "solelink-fa511.firebaseapp.com",
  projectId: "solelink-fa511",
  storageBucket: "solelink-fa511.firebasestorage.app",
  messagingSenderId: "904651830008",
  appId: "1:904651830008:web:3feb88449a02717bf0410d",
  measurementId: "G-4PCXP7B8WX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export const storage = getStorage(app);

// Initialize Analytics (only in browser)
if (typeof window !== 'undefined') {
  getAnalytics(app);
}

export default app;

