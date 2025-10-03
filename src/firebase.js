import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCzySVIeOmd1dpGxRj0D__tk8zDNBj0yJc",
  authDomain: "wealthtracker-a2600.firebaseapp.com",
  projectId: "wealthtracker-a2600",
  storageBucket: "wealthtracker-a2600.firebasestorage.app",
  messagingSenderId: "745752113389",
  appId: "1:745752113389:web:be09c6c0d70afc098d1ce4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
