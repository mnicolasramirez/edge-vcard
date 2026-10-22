(() => {
  const $ = (id) => document.getElementById(id);
  const toast = $("toast");
  const say = (text) => {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  // Tap counts: one beacon per tap on anything marked data-t, with the event and source the page
  // was shown with. sendBeacon survives leaving the page (tel:, sms:, WhatsApp, new tabs).
  const main = document.querySelector("main.me");
  const base = (main && main.dataset.base) || "";
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-t]");
    if (!el || !main) return;
    const params = new URLSearchParams({ t: el.dataset.t });
    for (const key of ["e", "v", "s"]) {
      if (main.dataset[key]) params.set(key, main.dataset[key]);
    }
    const url = base + "/t?" + params;
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
      fetch(url, { method: "POST", keepalive: true }).catch(() => {});
    } catch {}
  }, true);

  // With a mouse (a computer), web links open in a new tab so the card stays open behind them.
  // Phones and tablets keep the same tab, which lets LinkedIn and WhatsApp hand over to their apps.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    for (const a of document.querySelectorAll(".me-dock a[href^='http'], .me-rows a[href^='http']")) {
      if (!a.target) a.target = "_blank";
    }
  }

  // In-app browsers (LinkedIn, Instagram, Facebook) often cannot hand a .vcf to Contacts.
  const ua = navigator.userAgent || "";
  if (/Instagram|FBAN|FBAV|LinkedInApp|Line\/|Twitter|MicroMessenger/i.test(ua)) {
    $("inapp").hidden = false;
  }

  $("share").addEventListener("click", async () => {
    const url = location.origin + location.pathname + location.search;
    const data = { title: document.title, text: document.title, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (err) {
        if (err && err.name !== "AbortError") say("Couldn't open share");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say(url);
    }
  });

  // The card flips to its QR side; the photo on it opens the photo instead.
  const card = $("card");
  const back = $("back");
  const flip = () => {
    const flipped = card.classList.toggle("flipped");
    back.setAttribute("aria-hidden", String(!flipped));
  };
  card.addEventListener("click", (e) => {
    if (!e.target.closest("#zoom")) flip();
  });
  $("flip").addEventListener("click", flip);

  const lb = $("lb");
  const zoom = $("zoom");
  const close = () => {
    lb.hidden = true;
    zoom.focus({ preventScroll: true });
  };
  zoom.addEventListener("click", (e) => {
    e.stopPropagation();
    lb.hidden = false;
    $("lbx").focus({ preventScroll: true });
  });
  lb.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lb.hidden) close();
  });

  // Swap contacts sheet (only on the page when the card has "swap": {"enabled": true}).
  const sheet = $("sheet");
  if (sheet) {
    const root = document.documentElement;
    const dim = $("dim");
    const form = $("swapform");
    const err = $("swaperr");
    const sendBtn = $("swapsend");
    const link = $("swaplink");
    let opened = 0;

    const open = () => {
      $("ask").hidden = false;
      $("done").hidden = true;
      sheet.hidden = false;
      dim.hidden = false;
      root.classList.add("me-sheet-open");
      opened = Date.now();
      sheet.focus({ preventScroll: true });
    };
    const shut = () => {
      sheet.hidden = true;
      dim.hidden = true;
      root.classList.remove("me-sheet-open");
      root.style.removeProperty("--me-kb");
      if (document.activeElement) document.activeElement.blur();
      link.focus({ preventScroll: true });
    };
    link.addEventListener("click", open);
    dim.addEventListener("click", shut);
    sheet.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", shut));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheet.hidden) shut();
    });

    // Keep the sheet above the on-screen keyboard, and the focused field in view.
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const fit = () => {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        if (kb > 80) root.style.setProperty("--me-kb", kb + "px");
        else root.style.removeProperty("--me-kb");
      };
      vv.addEventListener("resize", fit);
      vv.addEventListener("scroll", fit);
    }
    sheet.addEventListener("focusin", (e) => {
      if (e.target.matches("input")) setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
    });

    // Return on a field moves to the next one; on the last one it sends.
    const fields = [...form.querySelectorAll("input:not([tabindex='-1'])")];
    fields.forEach((f, i) =>
      f.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (i < fields.length - 1) fields[i + 1].focus();
        else form.requestSubmit();
      })
    );

    const messages = {
      name: "Please add your name.",
      reach: "Please add an email or a phone number.",
      email: "That email doesn't look right.",
      phone: "That phone number doesn't look right.",
      busy: "Too many at once. Please try again in a few minutes.",
    };
    const fail = (code, field) => {
      err.textContent = messages[code] || "Couldn't send. Please try again.";
      fields.forEach((f) => f.removeAttribute("aria-invalid"));
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.focus();
      }
    };
    const val = (name) => form.elements[name].value.trim();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const email = val("email");
      const phone = val("phone");
      if (!val("name")) return fail("name", form.elements.name);
      if (!email && !phone) return fail("reach", form.elements.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("email", form.elements.email);
      const body = {
        name: val("name"),
        email,
        phone,
        company: val("company"),
        role: val("role"),
        website: form.elements.website.value,
        ms: Date.now() - opened,
      };
      if (main) for (const key of ["e", "v", "s"]) if (main.dataset[key]) body[key] = main.dataset[key];
      sendBtn.disabled = true;
      try {
        const res = await fetch(base + "/swap", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) return fail(out.error, out.error && form.elements[out.error === "reach" ? "email" : out.error]);
        form.reset();
        fields.forEach((f) => f.removeAttribute("aria-invalid"));
        $("ask").hidden = true;
        $("done").hidden = false;
        sheet.scrollTop = 0;
      } catch {
        fail("network");
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  // Theme switch (theme.js already applied the starting theme before paint).
  const theme = $("theme");
  const label = () =>
    theme.setAttribute(
      "aria-label",
      document.documentElement.classList.contains("me-light") ? "Switch to dark mode" : "Switch to light mode"
    );
  theme.addEventListener("click", () => {
    if (window.cardTheme) window.cardTheme.toggle();
    label();
  });
  label();
})();
