// app.js
// Минималистичная логика сайта: PWA + UI‑фичи + лёгкий лайтбокс для иллюстраций.

import { getEffectiveTheme, getThemeMode, setThemeMode } from "./prefs.js";

export function initTheme(){
  // Тема управляется через assets/js/prefs.js.
}

export function wireThemeToggle(){
  const nav = document.querySelector(".navlinks");
  if (!nav) return;

  // Не добавляем повторно
  if (nav.querySelector("[data-role='themeSwitch']")) return;

  const wrap = document.createElement("label");
  wrap.className = "theme-switch";
  wrap.setAttribute("data-role", "themeSwitch");
  wrap.setAttribute("title", "Переключить светлую/тёмную тему");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "theme-toggle";
  input.setAttribute("aria-label", "Тёмная тема");

  const text = document.createElement("span");
  text.className = "small";
  text.textContent = "Тема";

  const eff = getEffectiveTheme();
  input.checked = (eff === "dark");

  input.addEventListener("change", () => {
    setThemeMode(input.checked ? "dark" : "light");
    // после смены обновим состояние на случай, если логика изменится
    input.checked = (getEffectiveTheme() === "dark");
  });

  // Long-press / ПКМ — вернуть авто
  wrap.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    setThemeMode("auto");
    input.checked = (getEffectiveTheme() === "dark");
    const mode = getThemeMode();
    wrap.classList.toggle("is-auto", mode === "auto");
  });

  wrap.appendChild(input);
  wrap.appendChild(text);

  // Вставляем ближе к концу, но до кнопки «Настройки» (она добавится позже)
  nav.appendChild(wrap);

  wrap.classList.toggle("is-auto", getThemeMode() === "auto");
}

export function wirePWA(){
  if (!("serviceWorker" in navigator)) return;

  const h = (location.hostname || "").toLowerCase();
  const isLocal = h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";

  // В локальной разработке service worker мешает (кэширует старые страницы/JS).
  // Поэтому отключаем регистрацию и пытаемся убрать уже установленный SW.
  if (isLocal){
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {});
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function qs(sel, root=document){
  return root.querySelector(sel);
}

function qsa(sel, root=document){
  return Array.from(root.querySelectorAll(sel));
}

function clamp(x, a, b){
  return Math.max(a, Math.min(b, x));
}

function parsePhotoHash(){
  const m = (window.location.hash || "").match(/photo=(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n - 1;
}

function clearHash(){
  const u = new URL(window.location.href);
  u.hash = "";
  history.replaceState(null, "", u);
}

function applyUIPrefs(){
  const KEY = "chem_ui_prefs_v1";
  let p = { fontScale: 1, compact: false, motion: "auto" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) p = { ...p, ...JSON.parse(raw) };
  } catch {}

  const scale = Number(p.fontScale);
  if (Number.isFinite(scale)){
    document.documentElement.style.setProperty("--font-scale", String(clamp(scale, 0.9, 1.25)));
  }

  document.documentElement.dataset.compact = p.compact ? "1" : "0";

  if (p.motion === "reduce") document.documentElement.dataset.motion = "reduce";
  else delete document.documentElement.dataset.motion;

  return { KEY, p };
}

function toast(msg){
  let t = qs(".toast");
  if (!t){
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 1800);
}

function wireConnectivity(){
  window.addEventListener("offline", () => toast("Офлайн: результаты сохранятся на устройстве"));
  window.addEventListener("online",  () => toast("Онлайн"));
}

function wireSettings(){
  const { KEY, p } = applyUIPrefs();

  const nav = qs(".navlinks");
  if (!nav) return;

  // Кнопка настроек
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost";
  btn.textContent = "Настройки";
  btn.setAttribute("aria-label", "Открыть настройки");

  const modal = document.createElement("div");
  modal.className = "settings hidden";
  modal.innerHTML = `
    <div class="settings-backdrop" data-action="close" aria-hidden="true"></div>
    <div class="settings-card" role="dialog" aria-modal="true" aria-label="Настройки">
      <div class="settings-head">
        <div>
          <b>Настройки</b>
          <div class="small">Читабельность и поведение интерфейса.</div>
        </div>
        <button class="iconbtn" data-action="close" type="button" aria-label="Закрыть">✕</button>
      </div>

      <div class="settings-body">
        <div class="settings-row">
          <label>
            <span class="small">Масштаб шрифта</span>
            <select class="select" id="uiFont">
              <option value="0.95">Меньше</option>
              <option value="1" selected>Обычно</option>
              <option value="1.1">Больше</option>
              <option value="1.2">Очень крупно</option>
            </select>
          </label>

          <label class="settings-inline">
            <input type="checkbox" id="uiCompact"/>
            <span>Компактный режим</span>
          </label>

          <label class="settings-inline">
            <input type="checkbox" id="uiReduce"/>
            <span>Меньше анимаций</span>
          </label>
        </div>

        <div class="small">Совет: в тестах работают клавиши 1–4 для ответа и Enter для «Дальше».</div>
      </div>

      <div class="settings-foot">
        <button class="btn" data-action="close" type="button">Готово</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  nav.appendChild(btn);

  const uiFont = qs("#uiFont", modal);
  const uiCompact = qs("#uiCompact", modal);
  const uiReduce = qs("#uiReduce", modal);

  if (uiFont) uiFont.value = String(p.fontScale ?? 1);
  if (uiCompact) uiCompact.checked = !!p.compact;
  if (uiReduce) uiReduce.checked = (p.motion === "reduce");

  function save(){
    const next = {
      fontScale: Number(uiFont?.value || 1),
      compact: !!uiCompact?.checked,
      motion: uiReduce?.checked ? "reduce" : "auto"
    };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    applyUIPrefs();
  }

  uiFont?.addEventListener("change", save);
  uiCompact?.addEventListener("change", save);
  uiReduce?.addEventListener("change", save);

  function open(){
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    const closeBtn = qs("[data-action='close']", modal);
    closeBtn?.focus();
  }

  function close(){
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  btn.addEventListener("click", open);

  modal.addEventListener("click", (e) => {
    const el = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
    const act = el && el.getAttribute && el.getAttribute("data-action");
    if (act === "close") close();
  });

  document.addEventListener("keydown", (e) => {
    if (modal.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
  });
}

function enhanceGallery(){
  const grid = qs(".gallery");
  if (!grid) return;

  // Если вдруг кто-то пришёл по старой ссылке — убираем hash и не автозапускаем просмотр.
  if (parsePhotoHash() != null) clearHash();

  const imgs = qsa("img", grid).filter(img => img.getAttribute("src"));
  if (!imgs.length) return;

  imgs.forEach(img => {
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    img.setAttribute("data-gallery", "1");
  });

  const items = imgs.map((img, i) => ({
    i,
    src: img.getAttribute("src"),
    alt: (img.getAttribute("alt") || "").trim(),
    el: img
  }));

  // Favorites (для картинок)
  const FAV_KEY = "chem_gallery_favs";
  const readFavs = () => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
    catch { return new Set(); }
  };
  const writeFavs = (set) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set))); } catch {}
  };
  const isFav = (set, src) => set.has(src);

  const favs = readFavs();

  items.forEach(({src, el}) => {
    const card = el.closest(".imgcard");
    if (!card) return;
    card.classList.toggle("is-fav", isFav(favs, src));
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Открыть изображение");
  });

  const lb = document.createElement("div");
  lb.className = "lightbox hidden";
  lb.innerHTML = `
    <div class="lightbox-backdrop" data-action="close" aria-hidden="true"></div>
    <div class="lightbox-card" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
      <div class="lightbox-toolbar">
        <div class="lightbox-meta">
          <span class="lightbox-count" data-role="count"></span>
          <span class="lightbox-caption" data-role="caption"></span>
        </div>
        <div class="lightbox-actions">
          <button class="iconbtn" data-action="fav" type="button" aria-label="В избранное">★</button>
          <button class="iconbtn" data-action="copy" type="button" aria-label="Копировать ссылку">Ссылка</button>
          <a class="iconbtn" data-action="download" download aria-label="Скачать">Скачать</a>
          <button class="iconbtn" data-action="play" type="button" aria-label="Слайд‑шоу">▶</button>
          <button class="iconbtn" data-action="close" type="button" aria-label="Закрыть">✕</button>
        </div>
      </div>
      <div class="lightbox-body">
        <button class="navbtn" data-action="prev" type="button" aria-label="Предыдущее">←</button>
        <img class="lightbox-img" data-role="img" alt="" />
        <button class="navbtn" data-action="next" type="button" aria-label="Следующее">→</button>
      </div>
      <div class="lightbox-hint small">Esc — закрыть, ←/→ — листать</div>
    </div>
  `;
  document.body.appendChild(lb);

  const imgEl = qs("[data-role='img']", lb);
  const capEl = qs("[data-role='caption']", lb);
  const cntEl = qs("[data-role='count']", lb);
  const dlEl  = qs("[data-action='download']", lb);
  const favBtn = qs("[data-action='fav']", lb);
  const playBtn = qs("[data-action='play']", lb);

  let idx = 0;
  let timer = null;

  function render(){
    const cur = items[idx];
    imgEl.src = cur.src;
    imgEl.alt = cur.alt || "";
    capEl.textContent = cur.alt || "";
    cntEl.textContent = `${idx+1}/${items.length}`;
    dlEl.setAttribute("href", cur.src);

    const fav = isFav(favs, cur.src);
    favBtn.classList.toggle("is-on", fav);
    favBtn.textContent = fav ? "★" : "☆";

    items.forEach(({src, el}) => {
      const card = el.closest(".imgcard");
      if (!card) return;
      card.classList.toggle("is-fav", isFav(favs, src));
    });
  }

  function open(i){
    idx = clamp(i, 0, items.length-1);
    lb.classList.remove("hidden");
    document.body.classList.add("modal-open");
    render();
    const closeBtn = qs("[data-action='close']", lb);
    if (closeBtn) closeBtn.focus();
  }

  function close(){
    stop();
    lb.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function next(){ idx = (idx + 1) % items.length; render(); }
  function prev(){ idx = (idx - 1 + items.length) % items.length; render(); }

  function play(){
    if (timer) return;
    playBtn.classList.add("is-on");
    playBtn.textContent = "❚❚";
    timer = setInterval(next, 2500);
  }

  function stop(){
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    playBtn.classList.remove("is-on");
    playBtn.textContent = "▶";
  }

  function togglePlay(){ timer ? stop() : play(); }

  function toggleFav(){
    const cur = items[idx];
    if (isFav(favs, cur.src)) favs.delete(cur.src);
    else favs.add(cur.src);
    writeFavs(favs);
    render();
  }

  async function copyLink(){
    try {
      await navigator.clipboard.writeText(items[idx].src);
      const btn = qs("[data-action='copy']", lb);
      if (btn){
        const old = btn.textContent;
        btn.textContent = "Скопировано";
        setTimeout(() => (btn.textContent = old), 900);
      }
    } catch {}
  }

  function onClick(e){
    const el = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
    const act = el && el.getAttribute && el.getAttribute("data-action");
    if (!act) return;
    if (act === "close") close();
    if (act === "next") next();
    if (act === "prev") prev();
    if (act === "fav") toggleFav();
    if (act === "play") togglePlay();
    if (act === "copy") copyLink();
  }

  lb.addEventListener("click", onClick);

  document.addEventListener("keydown", (e) => {
    if (lb.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === " ") { e.preventDefault(); togglePlay(); }
  });

  let x0 = null;
  lb.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  lb.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 60) return;
    dx < 0 ? next() : prev();
  });

  items.forEach(({i, el}) => {
    const card = el.closest(".imgcard");
    if (!card) return;
    card.addEventListener("click", () => open(i));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyUIPrefs();
  wireConnectivity();
  wireThemeToggle();
  wireSettings();
  enhanceGallery();
});
