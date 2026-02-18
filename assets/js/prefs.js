/*
  prefs.js
  Автоматическая тема: строго светлая/тёмная — только по настройке системы.
  Оставляем совместимость с прошлым API (initPrefs/wirePrefs),
  но не показываем и не используем ручные переключатели.
*/

function applyThemeFromSystem(){
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function applyMotionFromSystem(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.setAttribute("data-motion", reduce ? "reduce" : "ok");
}

export function initPrefs(){
  applyThemeFromSystem();
  applyMotionFromSystem();

  if (window.matchMedia) {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    if (m.addEventListener) m.addEventListener("change", applyThemeFromSystem);
    else if (m.addListener) m.addListener(applyThemeFromSystem);

    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (r.addEventListener) r.addEventListener("change", applyMotionFromSystem);
    else if (r.addListener) r.addListener(applyMotionFromSystem);
  }
}

// Совместимость со старыми страницами (кнопки/селекты мы скрываем CSS-ом)
export function wirePrefs(){
  // no-op
}

document.addEventListener("DOMContentLoaded", initPrefs);
