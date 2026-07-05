import { days } from "./data.js";
import { EVENT_SETTINGS } from "./config.js";
import { initFirebase, getFirebaseState } from "./firebase.js";

const $ = (selector) => document.querySelector(selector);
const LOCAL_SESSION_KEY = "oh_admin_session";
let storageMode = "local";
let submissions = [];
let draws = [];
let adminUser = null;

function getLocalSession() {
  try {
    return JSON.parse(sessionStorage.getItem(LOCAL_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function setLocalSession(email) {
  sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
}

function clearLocalSession() {
  sessionStorage.removeItem(LOCAL_SESSION_KEY);
}

function setLoggedIn(isLoggedIn, email = "") {
  document.body.classList.toggle("is-logged-in", isLoggedIn);
  $("#admin-email").textContent = isLoggedIn ? email : "не виконано";
  if (isLoggedIn) refresh();
}

const dayById = new Map(days.map((day) => [day.id, day]));

function getLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(value) {
  if (!value) return "—";
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return date.toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function setStatus(message, type = "info") {
  const el = $("#admin-status");
  if (!el) return;
  el.textContent = message;
  el.className = `form-status form-status--${type}`;
}

async function loadFirebaseData() {
  const { db, firestoreFns } = getFirebaseState();
  const { collection, getDocs, query, orderBy } = firestoreFns;

  const subSnap = await getDocs(query(collection(db, "submissions"), orderBy("createdAtIso", "desc")));
  submissions = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const drawSnap = await getDocs(query(collection(db, "draws"), orderBy("createdAtIso", "desc")));
  draws = drawSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function loadLocalData() {
  submissions = getLocal("oh_submissions");
  draws = getLocal("oh_draws");
}

async function saveDraw(draw) {
  const fullDraw = { ...draw, createdAtIso: new Date().toISOString() };
  if (storageMode === "firebase") {
    const { db, firestoreFns } = getFirebaseState();
    const { addDoc, collection, serverTimestamp } = firestoreFns;
    await addDoc(collection(db, "draws"), { ...fullDraw, createdAt: serverTimestamp() });
  } else {
    draws.unshift({ ...fullDraw, id: crypto.randomUUID() });
    setLocal("oh_draws", draws);
  }
}

function renderStats() {
  const total = submissions.length;
  const unique = new Set(submissions.map((item) => normalizeName(item.name))).size;
  $("#stat-total").textContent = total;
  $("#stat-unique").textContent = unique;
  $("#stat-days").textContent = days.filter((day) => submissions.some((item) => item.dayId === day.id)).length;

  const byDay = $("#by-day");
  byDay.innerHTML = days.map((day) => {
    const count = submissions.filter((item) => item.dayId === day.id).length;
    return `<div class="mini-stat"><b>${day.shortDate}</b><span>${count} дописів</span></div>`;
  }).join("");
}

function renderTopParticipants() {
  const map = new Map();
  submissions.forEach((item) => {
    const key = normalizeName(item.name);
    if (!key) return;
    if (!map.has(key)) map.set(key, { name: item.name, count: 0, links: [] });
    const record = map.get(key);
    record.count += 1;
    record.links.push(item.postUrl);
  });

  const top = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);
  const body = $("#top-body");
  body.innerHTML = top.length
    ? top.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.count}</td>
        <td><a href="${item.links[0]}" target="_blank" rel="noopener">Відкрити приклад</a></td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">Поки що немає заявок.</td></tr>`;
}

function renderSubmissions() {
  const body = $("#submissions-body");
  body.innerHTML = submissions.length
    ? submissions.map((item) => {
      const day = dayById.get(item.dayId);
      return `
        <tr>
          <td>${item.name || "—"}</td>
          <td>${day ? day.shortDate : item.dayId || "—"}</td>
          <td>${item.platform || "—"}</td>
          <td><a href="${item.postUrl}" target="_blank" rel="noopener">Відкрити пост</a></td>
          <td>${formatDate(item.createdAtIso || item.createdAt)}</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="5">Поки що немає доданих постів.</td></tr>`;
}

function renderDrawControls() {
  const box = $("#daily-draws");
  box.innerHTML = days.map((day) => `
    <button class="btn btn--soft" data-draw-day="${day.id}">
      Розіграш: ${day.shortDate}
    </button>
  `).join("");
}

function renderDrawHistory() {
  const body = $("#draws-body");
  body.innerHTML = draws.length
    ? draws.map((draw) => {
      const day = draw.dayId ? dayById.get(draw.dayId) : null;
      return `
        <tr>
          <td>${draw.type === "final" ? "Загальний" : "Денний"}</td>
          <td>${day ? day.shortDate : "Усі дні"}</td>
          <td>${draw.winnerName || "—"}</td>
          <td><a href="${draw.postUrl}" target="_blank" rel="noopener">Відкрити пост</a></td>
          <td>${formatDate(draw.createdAtIso || draw.createdAt)}</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="5">Історія розіграшів порожня.</td></tr>`;
}

function renderAll() {
  renderStats();
  renderTopParticipants();
  renderSubmissions();
  renderDrawControls();
  renderDrawHistory();
}

async function refresh() {
  if (storageMode === "firebase") await loadFirebaseData();
  else loadLocalData();
  renderAll();
}

function showWinner(winner, title) {
  const box = $("#winner-box");
  box.innerHTML = `
    <div class="winner-card">
      <span class="eyebrow">${title}</span>
      <h3>${winner.name}</h3>
      <p>${dayById.get(winner.dayId)?.title || "Усі дні активності"}</p>
      <a class="btn" href="${winner.postUrl}" target="_blank" rel="noopener">Відкрити пост переможця</a>
    </div>
  `;
}

async function handleDailyDraw(dayId) {
  const day = dayById.get(dayId);
  const eligible = submissions.filter((item) => item.dayId === dayId);
  const winner = pickRandom(eligible);
  if (!winner) {
    setStatus(`За ${day?.shortDate || "цей день"} ще немає заявок.`, "error");
    return;
  }

  await saveDraw({
    type: "daily",
    dayId,
    submissionId: winner.id || "local",
    winnerName: winner.name,
    postUrl: winner.postUrl
  });
  showWinner(winner, `Переможець дня: ${day.shortDate}`);
  setStatus("Розіграш проведено. Переможця збережено в історії.", "success");
  await refresh();
}

async function handleFinalDraw() {
  const winner = pickRandom(submissions);
  if (!winner) {
    setStatus("Загальний розіграш неможливий: поки що немає заявок.", "error");
    return;
  }

  await saveDraw({
    type: "final",
    dayId: "all",
    submissionId: winner.id || "local",
    winnerName: winner.name,
    postUrl: winner.postUrl
  });
  showWinner(winner, "Переможець загального розіграшу");
  setStatus("Загальний розіграш проведено. Переможця збережено в історії.", "success");
  await refresh();
}

function exportCsv() {
  const header = ["name", "day", "platform", "postUrl", "note", "createdAt"];
  const rows = submissions.map((item) => [
    item.name,
    dayById.get(item.dayId)?.shortDate || item.dayId,
    item.platform,
    item.postUrl,
    item.note || "",
    item.createdAtIso || ""
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "osvitni-horyzonty-submissions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function initHandlers() {
  document.addEventListener("click", async (event) => {
    const dailyButton = event.target.closest("[data-draw-day]");
    if (dailyButton) {
      await handleDailyDraw(dailyButton.dataset.drawDay);
      return;
    }
    if (event.target.closest("#final-draw")) await handleFinalDraw();
    if (event.target.closest("#refresh-data")) await refresh();
    if (event.target.closest("#export-csv")) exportCsv();
  });
}

function initLogin() {
  const loginForm = $("#login-form");
  const logoutButton = $("#logout-button");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (storageMode === "firebase") {
      const { auth, authFns } = getFirebaseState();
      try {
        await authFns.signInWithEmailAndPassword(auth, email, password);
        setStatus("Вхід виконано. Дані завантажено.", "success");
      } catch (error) {
        console.error(error);
        setStatus("Не вдалося увійти. Перевірте email і пароль адміністратора.", "error");
      }
      return;
    }

    setStatus("Локальний вхід недоступний: сайт працює через Firebase.", "error");
  });

  logoutButton?.addEventListener("click", async () => {
    if (storageMode === "firebase") {
      const { auth, authFns } = getFirebaseState();
      await authFns.signOut(auth);
      return;
    }
    adminUser = null;
    clearLocalSession();
    setLoggedIn(false);
    setStatus("Ви вийшли з адмін-панелі.", "info");
  });
}

async function boot() {
  renderDrawControls();
  initHandlers();
  initLogin();

  try {
    const result = await initFirebase();
    storageMode = result.mode;
    if (storageMode === "firebase") {
      const { auth, authFns } = getFirebaseState();
      authFns.onAuthStateChanged(auth, async (user) => {
        adminUser = user;
        document.body.classList.toggle("is-logged-in", Boolean(user));
        $("#admin-email").textContent = user?.email || "не виконано";
        if (user) await refresh();
      });
      setStatus("Firebase підключено. Увійдіть як адміністратор, щоб бачити заявки.", "info");
    } else {
      document.body.classList.add("is-local-mode");
      const session = getLocalSession();
      if (session?.email) {
        adminUser = { email: session.email };
        setLoggedIn(true, session.email);
        setStatus("Демо-режим: показуються заявки, збережені у цьому браузері.", "info");
      } else {
        setLoggedIn(false);
        setStatus("Демо-режим: увійдіть тестовими даними адміністратора.", "info");
      }
    }
  } catch (error) {
    console.error(error);
    storageMode = "local";
    document.body.classList.add("is-local-mode");
    const session = getLocalSession();
    if (session?.email) {
      adminUser = { email: session.email };
      setLoggedIn(true, session.email);
    } else {
      setLoggedIn(false);
    }
    setStatus("Firebase не підключився. Адмінка працює у локальному демо-режимі.", "error");
  }
}

boot();
