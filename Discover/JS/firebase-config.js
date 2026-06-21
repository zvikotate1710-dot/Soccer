/* =============================================
   SCOUTLINK — FIREBASE CONFIG
   Shared initialization for Auth + Firestore + Storage + Realtime DB
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import {
  getDatabase,
  ref as dbRef,
  push,
  set,
  get,
  update,
  onValue,
  off,
  serverTimestamp as rtdbServerTimestamp,
  query as dbQuery,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// --- Your Firebase project config ---
const firebaseConfig = {
  apiKey: "AIzaSyA0bS5oI0ZNEEWr7t_3BRl7oRrjhtRBTWY",
  authDomain: "scoutlink-c7f7b.firebaseapp.com",
  projectId: "scoutlink-c7f7b",
  storageBucket: "scoutlink-c7f7b.firebasestorage.app",
  messagingSenderId: "91128729399",
  appId: "1:91128729399:web:7a92a800bcb174259bd4b2",
  databaseURL: "https://scoutlink-c7f7b-default-rtdb.europe-west1.firebasedatabase.app"
};

// --- Initialize ---
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const storage  = getStorage(app);
const rtdb     = getDatabase(app);

// --- Export everything pages will need ---
export {
  app,
  auth,
  db,
  storage,
  rtdb,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  dbRef,
  push,
  set,
  get,
  update,
  onValue,
  off,
  rtdbServerTimestamp,
  dbQuery,
  orderByChild
};
