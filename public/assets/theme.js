// Card page theme, run in <head> before the first paint so the page never flashes the wrong one.
// The starting mode comes from the card's theme (<html data-mode>: light, dark or system); the
// sun/moon switch overrides it and the choice is kept on this device in localStorage.
(() => {
  const root = document.documentElement;
  const KEY = "card-theme";
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}

  const start = () => {
    if (saved === "light" || saved === "dark") return saved;
    if (root.dataset.mode === "dark") return "dark";
    if (root.dataset.mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  };

  const apply = (mode) => {
    const light = mode === "light";
    root.classList.toggle("me-light", light);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = light ? root.dataset.tcLight : root.dataset.tcDark;
  };

  apply(start());

  window.cardTheme = {
    toggle() {
      saved = root.classList.contains("me-light") ? "dark" : "light";
      try {
        localStorage.setItem(KEY, saved);
      } catch {}
      apply(saved);
      return saved;
    },
  };
})();
