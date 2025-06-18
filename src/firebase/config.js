import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDF2guOlFSNxCZ_Gd57cSC2dX0-IOgmJic",
  authDomain: "text-summarizer-3b89a.firebaseapp.com",
  projectId: "text-summarizer-3b89a",
  storageBucket: "text-summarizer-3b89a.appspot.com",
  messagingSenderId: "601120925991",
  appId: "1:601120925991:web:bc70cb3e49cd2f84ede102",
  measurementId: "G-79ZSM0G1R1"
};

// Initialize Firebase
let app;
let auth;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Set auth persistence to SESSION (cleared when browser is closed)
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      console.log('Auth persistence set to session');
    })
    .catch((error) => {
      console.error('Error setting auth persistence:', error);
    });

  db = getFirestore(app);
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });

  // Initialize Analytics only in production
  if (process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
  }

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { auth, db, analytics };
export default app; 