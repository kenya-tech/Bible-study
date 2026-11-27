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

  // ---------- Mobile navigation ----------
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("main-nav");

  function setMenu(open) {
    if (!header || !toggle) return;
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    toggle.innerHTML = `<i data-lucide="${open ? "x" : "menu"}"></i>`;
    renderIcons();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      setMenu(!header.classList.contains("nav-open"));
    });

    nav.addEventListener("click", event => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && header.classList.contains("nav-open")) {
        setMenu(false);
        toggle.focus();
      }
    });

    window.matchMedia("(min-width: 901px)").addEventListener("change", e => {
      if (e.matches) setMenu(false);
    });
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

  // ---------- Header shadow on scroll ----------
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
