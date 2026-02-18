/*
  prefs.js
  Тема: по умолчанию — по настройке системы, но можно вручную переключать.
  Храним режим в localStorage.

  Важно: страницы грузят prefs.js через динамический import(), поэтому DOMContentLoaded
  может уже пройти к моменту загрузки модуля. Инициализируемся сразу, если DOM уже готов.
*/

const THEME_KEY = "chem_theme_mode_v1"; // 'auto' | 'light' | 'dark'
let _inited = false;

function readThemeMode(){
  try {
    const v = String(localStorage.getItem(THEME_KEY) || "auto");
    if (v === "light" || v === "dark" || v === "auto") return v;
    return "auto";
  } catch {
    return "auto";
  }
}

function writeThemeMode(mode){
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
}

function systemTheme(){
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

function applyTheme(mode){
  const m = mode || readThemeMode();
  const theme = (m === "auto") ? systemTheme() : m;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-theme-mode", m);
}

function applyMotionFromSystem(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.setAttribute("data-motion", reduce ? "reduce" : "ok");
}

export function getThemeMode(){
  return readThemeMode();
}

export function getEffectiveTheme(){
  return document.documentElement.getAttribute("data-theme") || systemTheme();
}

export function setThemeMode(mode){
  const m = (mode === "light" || mode === "dark" || mode === "auto") ? mode : "auto";
  writeThemeMode(m);
  applyTheme(m);
}

export function initPrefs(){
  if (_inited) return;
  _inited = true;

  applyTheme(readThemeMode());
  applyMotionFromSystem();

  if (window.matchMedia) {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = () => {
      if (readThemeMode() === "auto") applyTheme("auto");
    };
    if (m.addEventListener) m.addEventListener("change", onThemeChange);
    else if (m.addListener) m.addListener(onThemeChange);

    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => applyMotionFromSystem();
    if (r.addEventListener) r.addEventListener("change", onMotionChange);
    else if (r.addListener) r.addListener(onMotionChange);
  }
}

// Совместимость со старыми страницами
export function wirePrefs(){
  // no-op
}

// Авто‑инициализация (учёт динамического импорта)
if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initPrefs, { once: true });
} else {
  initPrefs();
}
