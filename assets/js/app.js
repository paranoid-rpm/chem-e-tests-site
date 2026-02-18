// app.js
// Минималистичная логика сайта: PWA + улучшения галереи.

export function initTheme(){
  // Тема управляется через assets/js/prefs.js по настройке системы.
}

export function wireThemeToggle(){
  // Ручной переключатель темы отключён: оставляем кнопку скрытой (CSS).
}

export function wirePWA(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
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

function isGalleryPage(){
  const p = (location.pathname || "").toLowerCase();
  return p.endsWith("/gallery.html") || p.endsWith("gallery.html");
}

function enhanceGallery(){
  const grid = qs(".gallery");
  if (!grid) return;

  const imgs = qsa("img", grid).filter(img => img.getAttribute("src"));
  if (!imgs.length) return;

  const allowHash = isGalleryPage();

  // Ленивая загрузка по возможности
  imgs.forEach(img => {
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    img.setAttribute("data-gallery", "1");
  });

  // Собираем список
  const items = imgs.map((img, i) => ({
    i,
    src: img.getAttribute("src"),
    alt: (img.getAttribute("alt") || "").trim(),
    el: img
  }));

  // Favorites
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

  // UI: лёгкий бейдж на карточке
  items.forEach(({src, el}) => {
    const card = el.closest(".imgcard");
    if (!card) return;
    card.classList.toggle("is-fav", isFav(favs, src));
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Открыть изображение");
  });

  // Lightbox
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

  function setHash(i){
    if (!allowHash) return;
    const u = new URL(window.location.href);
    u.hash = `photo=${i+1}`;
    history.replaceState(null, "", u);
  }

  function clearHash(){
    const u = new URL(window.location.href);
    u.hash = "";
    history.replaceState(null, "", u);
  }

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

    // карточки
    items.forEach(({src, el}) => {
      const card = el.closest(".imgcard");
      if (!card) return;
      card.classList.toggle("is-fav", isFav(favs, src));
    });

    setHash(idx);
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
    clearHash();
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
      await navigator.clipboard.writeText(window.location.href);
      const btn = qs("[data-action='copy']", lb);
      if (btn){
        const old = btn.textContent;
        btn.textContent = "Скопировано";
        setTimeout(() => (btn.textContent = old), 900);
      }
    } catch {}
  }

  // events
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

  // Swipe (минимально)
  let x0 = null;
  lb.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  lb.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 60) return;
    dx < 0 ? next() : prev();
  });

  // Open from cards
  items.forEach(({i, el}) => {
    const card = el.closest(".imgcard");
    if (!card) return;
    card.addEventListener("click", () => open(i));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
    });
  });

  // Open from hash (только в gallery.html)
  const m = (window.location.hash || "").match(/photo=(\d+)/);
  if (m){
    if (!allowHash){
      clearHash();
    } else {
      const i = clamp(parseInt(m[1], 10) - 1, 0, items.length-1);
      setTimeout(() => open(i), 0);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  enhanceGallery();
});
