import { days } from "./data.js";
import { initFirebase, getFirebaseState } from "./firebase.js";

const $ = (selector) => document.querySelector(selector);
const dayById = new Map(days.map((day) => [day.id, day]));
let storageMode = "local";

function getLocalDraws() {
  try {
    return JSON.parse(localStorage.getItem("oh_draws") || "[]");
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return date.toLocaleString("uk-UA", { dateStyle: "long", timeStyle: "short" });
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDrawTime(draw) {
  if (draw.createdAtIso) return new Date(draw.createdAtIso).getTime() || 0;
  if (draw.createdAt?.seconds) return draw.createdAt.seconds * 1000;
  return 0;
}

function pickLatestWinners(draws) {
  const sorted = [...draws].sort((a, b) => getDrawTime(b) - getDrawTime(a));

  let finalWinner = null;
  const dailyByDay = new Map();

  sorted.forEach((draw) => {
    if (draw.type === "final" && !finalWinner) finalWinner = draw;
    if (draw.type === "daily" && draw.dayId && !dailyByDay.has(draw.dayId)) {
      dailyByDay.set(draw.dayId, draw);
    }
  });

  const dailyWinners = days
    .map((day) => {
      const draw = dailyByDay.get(day.id);
      return draw ? { day, draw } : null;
    })
    .filter(Boolean);

  return { finalWinner, dailyWinners };
}

function renderWinnerCard(draw, day, options = {}) {
  const isFinal = options.featured;
  const dayLabel = day ? day.shortDate : "Усі дні";
  const dayTitle = day ? day.title : "Загальний розіграш";
  const cardClass = isFinal ? "winner-public-card winner-public-card--final" : "winner-public-card";

  return `
    <article class="${cardClass}">
      <div class="winner-public-card__badge">${isFinal ? "Головний переможець" : `День ${day?.dayNumber || ""}`}</div>
      <div class="winner-public-card__body">
        <div class="winner-public-card__avatar" aria-hidden="true">${getInitials(draw.winnerName)}</div>
        <div class="winner-public-card__info">
          <p class="winner-public-card__day">${dayLabel}</p>
          <h3>${draw.winnerName || "Учасник"}</h3>
          <p class="winner-public-card__theme">${dayTitle}</p>
          ${formatDate(draw.createdAtIso || draw.createdAt) ? `<p class="winner-public-card__date">${formatDate(draw.createdAtIso || draw.createdAt)}</p>` : ""}
        </div>
      </div>
      <a class="btn ${isFinal ? "" : "btn--soft"}" href="${draw.postUrl}" target="_blank" rel="noopener">Переглянути допис</a>
    </article>
  `;
}

function setSectionsVisible(visible) {
  document.querySelectorAll(".winners-section").forEach((section) => {
    section.hidden = !visible;
  });
}

function renderEmpty() {
  const finalBox = $("#final-winner");
  const dailyBox = $("#daily-winners");
  const empty = $("#winners-empty");

  if (finalBox) finalBox.innerHTML = "";
  if (dailyBox) dailyBox.innerHTML = "";
  if (empty) empty.hidden = false;
  setSectionsVisible(false);
}

function renderWinners(draws) {
  const { finalWinner, dailyWinners } = pickLatestWinners(draws);
  const finalBox = $("#final-winner");
  const dailyBox = $("#daily-winners");
  const empty = $("#winners-empty");
  const countEl = $("#winners-count");

  if (!finalWinner && !dailyWinners.length) {
    renderEmpty();
    if (countEl) countEl.textContent = "0";
    return;
  }

  if (empty) empty.hidden = true;
  setSectionsVisible(true);
  if (countEl) countEl.textContent = String(dailyWinners.length + (finalWinner ? 1 : 0));

  if (finalBox) {
    finalBox.innerHTML = finalWinner
      ? renderWinnerCard(finalWinner, null, { featured: true })
      : `<p class="winners-placeholder">Загальний розіграш ще не проведено. Слідкуйте за оновленнями!</p>`;
  }

  if (dailyBox) {
    dailyBox.innerHTML = dailyWinners.length
      ? dailyWinners.map(({ day, draw }) => renderWinnerCard(draw, day)).join("")
      : `<p class="winners-placeholder">Денні переможці з’являться після перших розіграшів.</p>`;
  }
}

async function loadDraws() {
  if (storageMode === "firebase") {
    const { db, firestoreFns } = getFirebaseState();
    const { collection, getDocs, query, orderBy } = firestoreFns;
    const snap = await getDocs(query(collection(db, "draws"), orderBy("createdAtIso", "desc")));
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return getLocalDraws();
}

function setStatus(message, isError = false) {
  const el = $("#winners-status");
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "form-status form-status--error" : "form-status form-status--info";
}

async function boot() {
  const loading = $("#winners-loading");
  try {
    const result = await initFirebase();
    storageMode = result.mode;
    const draws = await loadDraws();
    renderWinners(draws);
    if (storageMode === "firebase") {
      setStatus("Дані оновлюються автоматично після кожного розіграшу.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Не вдалося завантажити переможців. Спробуйте оновити сторінку.", true);
    renderEmpty();
  } finally {
    if (loading) loading.hidden = true;
  }
}

boot();
