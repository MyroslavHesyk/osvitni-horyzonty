// Firebase Web App config (публічні ключі — це нормально для клієнтського застосунку).
// Ініціалізація Firebase відбувається у js/firebase.js через CDN.
// Доступ захищають Firestore Rules та Firebase Auth.

export const firebaseConfig = {
  apiKey: "AIzaSyBKWKHFkeixmkuI8AdFF1Yp1hDRRN-DOGA",
  authDomain: "osvitni-horyzonty.firebaseapp.com",
  projectId: "osvitni-horyzonty",
  storageBucket: "osvitni-horyzonty.firebasestorage.app",
  messagingSenderId: "50809523241",
  appId: "1:50809523241:web:23fa1a14f4ab1b3d9ca038"
};

export const EVENT_SETTINGS = {
  mainHashtag: "#ОсвітніГоризонти2026 #ІМЗО #Астро",
  siteTitle: "Освітні горизонти: літо професійного розвитку",
  telegramUrl: "https://t.me/+OuscbNhgCillMzky",
  imzoUrl: "https://imzo.gov.ua/",
  astroUrl: "https://astro-ngo.com/",
  peopleUrl: "https://astro-ngo.com/4people/",
};
