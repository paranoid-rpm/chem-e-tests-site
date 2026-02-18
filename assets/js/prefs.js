const K = {
  scale: "chem_font_scale",
  contrast: "chem_contrast",
  motion: "chem_motion",
  style: "chem_style"
};

export function initPrefs(){
  const scale = parseFloat(localStorage.getItem(K.scale) || "1");
  document.documentElement.style.setProperty("--font-scale", String(clamp(scale, 0.9, 1.3)));

  const contrast = localStorage.getItem(K.contrast);
  if(contrast) document.documentElement.setAttribute("data-contrast", contrast);

  const motion = localStorage.getItem(K.motion);
  if(motion) document.documentElement.setAttribute("data-motion", motion);

  const style = localStorage.getItem(K.style) || "minimal";
  document.documentElement.setAttribute("data-style", style);

  const sel = document.querySelector("[data-action='style-select']");
  if(sel) sel.value = style;
}

export function wirePrefs(){
  const root = document.documentElement;

  const setScale = (v) => {
    const next = clamp(v, 0.9, 1.3);
    root.style.setProperty("--font-scale", String(next));
    localStorage.setItem(K.scale, String(next));
  };

  document.querySelector("[data-action='font-inc']")?.addEventListener("click", () => {
    const cur = parseFloat(getComputedStyle(root).getPropertyValue("--font-scale")) || 1;
    setScale(cur + 0.05);
  });

  document.querySelector("[data-action='font-dec']")?.addEventListener("click", () => {
    const cur = parseFloat(getComputedStyle(root).getPropertyValue("--font-scale")) || 1;
    setScale(cur - 0.05);
  });

  document.querySelector("[data-action='toggle-contrast']")?.addEventListener("click", () => {
    const cur = root.getAttribute("data-contrast");
    const next = cur === "high" ? "" : "high";
    if(next) root.setAttribute("data-contrast", next);
    else root.removeAttribute("data-contrast");
    localStorage.setItem(K.contrast, next);
  });

  document.querySelector("[data-action='toggle-motion']")?.addEventListener("click", () => {
    const cur = root.getAttribute("data-motion");
    const next = cur === "reduce" ? "" : "reduce";
    if(next) root.setAttribute("data-motion", next);
    else root.removeAttribute("data-motion");
    localStorage.setItem(K.motion, next);
  });

  const styleSel = document.querySelector("[data-action='style-select']");
  styleSel?.addEventListener("change", () => {
    const next = styleSel.value || "minimal";
    root.setAttribute("data-style", next);
    localStorage.setItem(K.style, next);
  });
}

function clamp(x, a, b){
  return Math.max(a, Math.min(b, x));
}
