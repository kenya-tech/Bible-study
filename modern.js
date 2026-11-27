// ======================================================
// MODERN UI HELPERS
// - Renders Lucide icons (including ones added later by script.js)
// - Mobile navigation toggle
// - Header shadow on scroll
// ======================================================

(function () {
  "use strict";

  // ---------- Icons ----------
  let iconFrame = null;

  function renderIcons() {
    iconFrame = null;
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({
        attrs: { "stroke-width": 1.75, "aria-hidden": "true" }
      });
    }
  }

  function scheduleIcons() {
    if (!iconFrame) iconFrame = requestAnimationFrame(renderIcons);
  }

  renderIcons();

  // script.js inserts some icons dynamically (e.g. group cards), so watch
  // for new <i data-lucide> placeholders and render them.
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === 1 &&
          (node.matches("i[data-lucide]") || node.querySelector("i[data-lucide]"))
        ) {
          scheduleIcons();
          return;
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  const header = document.querySelector(".site-header");

  // ---------- Story: reading time + progress ----------
  const storyCard = document.querySelector("#story .story-card");
  const readingTime = document.getElementById("story-reading-time");
  const progressBar = document.querySelector(".read-progress span");

  function updateReadingTime() {
    if (!storyCard || !readingTime) return;
    const words = storyCard.textContent.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    readingTime.textContent = `${minutes} min read`;
  }

  if (storyCard) {
    updateReadingTime();
    // script.js replaces the story text when content loads from Firebase
    new MutationObserver(updateReadingTime).observe(storyCard, { childList: true });
  }

  function updateProgress() {
    if (!progressBar || !storyCard) return;
    const story = document.getElementById("story");
    if (!story || story.hidden) {
      progressBar.style.transform = "scaleX(0)";
      return;
    }
    const rect = storyCard.getBoundingClientRect();
    const total = rect.height - window.innerHeight * 0.6;
    const done = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
    progressBar.style.transform = `scaleX(${done})`;
  }

  // ---------- Sign-in: show / hide password ----------
  document.querySelectorAll(".signin-reveal").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.reveal);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.innerHTML = `<i data-lucide="${show ? "eye-off" : "eye"}"></i>`;
      renderIcons();
      input.focus();
    });
  });

  // ---------- Sign-in: password strength ----------
  const newPassword = document.getElementById("member-password");
  const strength = document.querySelector(".signin-strength");

  if (newPassword && strength) {
    const labels = ["", "Weak", "Okay", "Strong"];
    newPassword.addEventListener("input", () => {
      const value = newPassword.value;
      let score = 0;
      if (value.length >= 6) score++;
      if (value.length >= 10) score++;
      if (/[0-9]/.test(value) && /[a-zA-Z]/.test(value)) score++;
      if (!value) score = 0;
      else score = Math.max(1, Math.min(3, score));
      strength.dataset.strength = String(score);
      strength.querySelector("em").textContent = labels[score];
    });
  }

  // ---------- Sign-in: group tiles keep the <select> in sync ----------
  // script.js reads #member-group, so the tiles just set its value.
  const groupSelect = document.getElementById("member-group");

  if (groupSelect) {
    document.querySelectorAll('.signin-group input[name="groupChoice"]').forEach(radio => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        groupSelect.value = radio.value;
        groupSelect.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  }

  // ---------- Sign-in: tab state for assistive tech ----------
  const loginForm = document.getElementById("membership-login-form");
  const registerForm = document.getElementById("membership-form");
  const loginTab = document.getElementById("switch-to-login-btn");
  const registerTab = document.getElementById("switch-to-register-btn");

  if (loginForm && registerForm && loginTab && registerTab) {
    const syncTabs = () => {
      loginTab.setAttribute("aria-selected", String(!loginForm.hidden));
      registerTab.setAttribute("aria-selected", String(!registerForm.hidden));
    };
    const observer = new MutationObserver(syncTabs);
    observer.observe(loginForm, { attributes: true, attributeFilter: ["hidden"] });
    observer.observe(registerForm, { attributes: true, attributeFilter: ["hidden"] });
    syncTabs();
  }

  // ---------- Header: transparent at top, glass when scrolled ----------
  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
      updateProgress();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }
})();

// ======================================================
// UPDATE CHECK
// GitHub Pages lets browsers cache pages for ~10 minutes, so a freshly
// deployed version may not show until a manual refresh. Compare our
// version with version.json (fetched uncached) and reload when it changes:
// on load and whenever the user comes back to the tab.
// ======================================================

(function () {
  "use strict";

  const meta = document.querySelector('meta[name="app-version"]');
  const current = meta && meta.content;
  if (!current || !window.fetch) return;

  async function checkForUpdate() {
    try {
      const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const { version } = await response.json();
      if (!version || version === current) return;

      // Reload once per new version, to avoid a loop if a CDN is still stale.
      const key = `stmonica-reloaded-${version}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    } catch {
      // Offline or storage blocked: keep the current page.
    }
  }

  checkForUpdate();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
})();
