// 1) Для локального тесту нічого не змінюйте: сайт зберігатиме заявки у браузері.
// 2) Для реального запуску на GitHub Pages вставте дані Firebase Web App.
//    Firebase config НЕ є паролем. Доступ захищають Firestore Rules та Firebase Auth.
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Initialize Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyBKWKHFkeixmkuI8AdFF1Yp1hDRRN-DOGA",
  authDomain: "osvitni-horyzonty.firebaseapp.com",
  projectId: "osvitni-horyzonty",
  storageBucket: "osvitni-horyzonty.firebasestorage.app",
  messagingSenderId: "50809523241",
  appId: "1:50809523241:web:23fa1a14f4ab1b3d9ca038"
};
const app = initializeApp(firebaseConfig);
// Змініть перед публікацією або підключіть Firebase Auth для продакшену.
export const LOCAL_ADMIN = {
  email: "gesick2000@gmail.com",
  password: "1111"
};

export const EVENT_SETTINGS = {
  mainHashtag: "#ОсвітніГоризонти2026",
  siteTitle: "Освітні горизонти: літо професійного розвитку",
  telegramUrl: "https://t.me/+OuscbNhgCillMzky",
  imzoUrl: "https://imzo.gov.ua/",
  astroUrl: "https://astro-ngo.com/",
  peopleUrl: "https://astro-ngo.com/4people/",
};
