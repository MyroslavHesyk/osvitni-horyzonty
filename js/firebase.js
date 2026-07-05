import { firebaseConfig } from "./config.js";

let firebaseReady = false;
let app;
let db;
let auth;
let firestoreFns = {};
let authFns = {};

export function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export async function initFirebase() {
  if (!hasFirebaseConfig()) return { ready: false, mode: "local" };

  const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

  app = appModule.initializeApp(firebaseConfig);
  db = firestoreModule.getFirestore(app);
  auth = authModule.getAuth(app);
  firestoreFns = firestoreModule;
  authFns = authModule;
  firebaseReady = true;
  return { ready: true, mode: "firebase" };
}

export function getFirebaseState() {
  return { firebaseReady, db, auth, firestoreFns, authFns };
}
