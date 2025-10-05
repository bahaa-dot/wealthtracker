// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzySVIeOmd1dpGxRj0D__tk8zDNBj0yJc",
  authDomain: "wealthtracker-a2600.firebaseapp.com",
  projectId: "wealthtracker-a2600",
  storageBucket: "wealthtracker-a2600.firebasestorage.app",
  messagingSenderId: "745752113389",
  appId: "1:745752113389:web:be09c6c0d70afc098d1ce4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
