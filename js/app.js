import { days, getActiveDay } from "./data.js";
import { EVENT_SETTINGS } from "./config.js";
import { initFirebase, getFirebaseState } from "./firebase.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const activeDay = getActiveDay();
let storageMode = "local";

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function setExternalLink(el, url) {
  if (!url || url === "#") {
    el.removeAttribute("href");
    el.classList.add("is-disabled");
    el.setAttribute("aria-disabled", "true");
    return;
  }
  el.href = url;
  el.classList.remove("is-disabled");
  el.removeAttribute("aria-disabled");
}

function renderGlobalContent() {
  setText("#main-hashtag", EVENT_SETTINGS.mainHashtag);
  
  const tg = $("#telegram-link");
  if (tg) tg.href = EVENT_SETTINGS.telegramUrl;
  const imzo = $("#imzo-link");
  if (imzo) imzo.href = EVENT_SETTINGS.imzoUrl;
  const astro = $("#astro-link");
  if (astro) astro.href = EVENT_SETTINGS.astroUrl;
  const people = $("#people-link");
  if (people) people.href = EVENT_SETTINGS.peopleUrl;
}

function renderActiveDay(day) {
  setText("#active-day-date", day.shortDate);
  setText("#active-day-title", day.title);
  setText("#active-day-lead", day.lead);
  setText("#active-day-task", day.task);

  const tags = $("#active-day-tags");
  if (tags) {
    tags.innerHTML = [EVENT_SETTINGS.mainHashtag, ...day.hashtags]
      .map((tag) => `<span>${tag}</span>`)
      .join("");
  }

  const ideas = $("#active-day-ideas");
  if (ideas) {
    ideas.innerHTML = day.ideas.map((idea) => `<li>${idea}</li>`).join("");
  }

  const daySelect = $("#submission-day");
  if (daySelect) daySelect.value = day.id;
}

function renderDayCards() {
  const grid = $("#days-grid");
  if (!grid) return;

  grid.innerHTML = days
    .map((day) => {
      const tags = day.hashtags.map((tag) => `<span>${tag}</span>`).join("");
      const isActive = day.id === activeDay.id ? "is-active" : "";
      return `
        <article class="day-card ${isActive}">
          <div class="day-card__top">
            <span class="day-card__number">День ${day.dayNumber}</span>
            <span class="day-card__date">${day.shortDate}</span>
          </div>
          <h3>${day.title}</h3>
          <p>${day.lead}</p>
          <div class="tag-list">${tags}</div>
          <a class="text-link" href="?day=${day.id}#today">Відкрити завдання дня →</a>
        </article>
      `;
    })
    .join("");
}

function renderDaySelect() {
  const select = $("#submission-day");
  if (!select) return;
  select.innerHTML = days
    .map((day) => `<option value="${day.id}">${day.shortDate} — ${day.title}</option>`)
    .join("");
  select.value = activeDay.id;
}

function getLocalSubmissions() {
  try {
    return JSON.parse(localStorage.getItem("oh_submissions") || "[]");
  } catch {
    return [];
  }
}

function saveLocalSubmission(submission) {
  const all = getLocalSubmissions();
  all.push({ ...submission, id: crypto.randomUUID() });
  localStorage.setItem("oh_submissions", JSON.stringify(all));
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function showStatus(message, type = "success") {
  const status = $("#form-status");
  if (!status) return;
  status.textContent = message;
  status.className = `form-status form-status--${type}`;
}

async function submitToFirebase(submission) {
  const { db, firestoreFns } = getFirebaseState();
  const { addDoc, collection, serverTimestamp } = firestoreFns;
  await addDoc(collection(db, "submissions"), {
    ...submission,
    createdAt: serverTimestamp()
  });
}

function initForm() {
  const form = $("#submission-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const platform = String(formData.get("platform") || "").trim();
    const dayId = String(formData.get("day") || "").trim();
    const postUrl = normalizeUrl(String(formData.get("postUrl") || ""));
    const note = String(formData.get("note") || "").trim();

    if (name.length < 2) {
      showStatus("Вкажіть, будь ласка, ім’я та прізвище.", "error");
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(postUrl);
    } catch {
      showStatus("Посилання на допис виглядає некоректно. Перевірте URL.", "error");
      return;
    }

    const submission = {
      name,
      platform,
      dayId,
      postUrl: parsedUrl.toString(),
      note,
      createdAtIso: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 140)
    };

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Зберігаємо…";

    try {
      if (storageMode === "firebase") {
        await submitToFirebase(submission);
      } else {
        saveLocalSubmission(submission);
      }
      form.reset();
      renderDaySelect();
      showStatus("Дякуємо! Ваш допис додано до активності.", "success");
    } catch (error) {
      console.error(error);
      showStatus("Не вдалося зберегти заявку. Спробуйте ще раз або повідомте організаторів.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Додати мій допис";
    }
  });
}

async function boot() {
  renderGlobalContent();
  renderDaySelect();
  renderActiveDay(activeDay);
  renderDayCards();
  initForm();

  try {
    const result = await initFirebase();
    storageMode = result.mode;
    const modeNotice = $("#mode-notice");
    if (modeNotice) {
      modeNotice.textContent = storageMode === "firebase"
        ? "Сайт підключений до спільної бази даних."
        : "Демо-режим: заявки зберігаються лише у цьому браузері. Для реального запуску підключіть Firebase.";
    }
  } catch (error) {
    console.error(error);
    storageMode = "local";
    const modeNotice = $("#mode-notice");
    if (modeNotice) modeNotice.textContent = "Firebase не підключився, тому сайт працює у локальному демо-режимі.";
  }
}

boot();
