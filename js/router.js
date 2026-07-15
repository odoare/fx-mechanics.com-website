// Fetch-based navigation: swaps only <main>, so the header
// (and the <audio> element inside it) never gets torn down when
// moving between pages. Falls back to a normal navigation on any
// failure, so the site works fully with JS disabled.
//
// Requires http(s) — fetch() of local files is blocked by the
// browser's file:// CORS policy, so opening index.html directly
// (rather than through a local server) falls back to full page
// loads, which resets the player. That's a browser restriction,
// not something this code can work around.
(function () {
  if (location.protocol === "file:") {
    console.warn(
      "FX-Mechanics: page navigation and the persistent player require the site " +
        "to be served over http(s) — e.g. `python3 -m http.server` — not opened via file://."
    );
  }

  const PLUGIN_CATEGORIES = ["effects", "synths", "tools", "archived"];

  function sameOrigin(url) {
    return url.origin === location.origin;
  }

  function isRoutable(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    if (a.dataset.noRouter !== undefined) return false;
    let url;
    try {
      url = new URL(a.href, location.href);
    } catch (e) {
      return false;
    }
    if (!sameOrigin(url)) return false;
    if (!/\.html$/.test(url.pathname) && url.pathname !== "/") return false;
    return url;
  }

  function isCategoryLink(url) {
    return /plugins\.html$/.test(url.pathname) && PLUGIN_CATEGORIES.includes(url.hash.slice(1));
  }

  function applyCategoryFromHash(hash) {
    const key = hash.slice(1);
    if (!PLUGIN_CATEGORIES.includes(key)) return;
    const btn = document.querySelector('.filter-btn[data-filter="' + key + '"]');
    if (btn && !btn.classList.contains("active")) btn.click();
  }

  function updateActiveNav(pathname) {
    const norm = (p) => p.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
    document.querySelectorAll(".nav-link").forEach((a) => {
      let href;
      try {
        href = new URL(a.href, location.href).pathname;
      } catch (e) {
        return;
      }
      a.classList.toggle("active", norm(href) === norm(pathname));
    });
  }

  async function goTo(url, { push = true } = {}) {
    let html;
    try {
      const res = await fetch(url.href, { credentials: "same-origin" });
      if (!res.ok) throw new Error("fetch failed");
      html = await res.text();
    } catch (e) {
      location.href = url.href;
      return;
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const newMain = doc.querySelector("main");
    const curMain = document.querySelector("main");
    if (!newMain || !curMain) {
      location.href = url.href;
      return;
    }

    curMain.replaceWith(document.importNode(newMain, true));
    document.title = doc.title;
    updateActiveNav(url.pathname);
    if (push) history.pushState({}, "", url.href);
    applyCategoryFromHash(url.hash);
    window.scrollTo(0, 0);
    document.body.classList.remove("nav-open");
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    const url = isRoutable(a);
    if (!url) return;
    const category = isCategoryLink(url);

    if (url.pathname === location.pathname) {
      if (!category) return; // plain in-page anchor: let the browser handle it
      e.preventDefault();
      applyCategoryFromHash(url.hash);
      if (url.href !== location.href) history.replaceState({}, "", url.href);
      return;
    }

    e.preventDefault();
    goTo(url);
  });

  window.addEventListener("popstate", () => {
    goTo(new URL(location.href), { push: false });
  });

  updateActiveNav(location.pathname);
  applyCategoryFromHash(location.hash);
})();
