// Real height for the QR view. In an iOS Home Screen app with a translucent status bar,
// 100vh, 100dvh and even innerHeight leave out the status bar, so the page ended short of
// the screen. There, in portrait, use the physical screen height instead.
(function () {
  var root = document.documentElement;
  var standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  if (standalone) root.classList.add("standalone");
  function set() {
    var h = window.innerHeight;
    if (standalone && window.innerHeight > window.innerWidth) h = Math.max(h, window.screen.height);
    root.style.setProperty("--app-h", h + "px");
  }
  set();
  window.addEventListener("resize", set);
  window.addEventListener("orientationchange", set);
  window.addEventListener("pageshow", set);
})();

// Offline: a service worker keeps a copy of this view and its files (serviceWorker in src/app.js).
(function () {
  if (!("serviceWorker" in navigator)) return;
  var base = document.documentElement.getAttribute("data-base") || "";
  window.addEventListener("load", function () {
    navigator.serviceWorker.register(base + "/qr-sw.js", { scope: base + "/qr" }).catch(function () {});
  });
})();
