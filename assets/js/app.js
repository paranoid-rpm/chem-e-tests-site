const THEME_KEY = "chem_site_theme";

export function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved){ setTheme(saved); return; }
  // авто: если светлая система — светлая тема
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  setTheme(prefersLight ? "light" : "dark");
}

export function wireThemeToggle(){
  const btn = document.querySelector("[data-action='toggle-theme']");
  if(!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });
}

export function wirePWA(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
