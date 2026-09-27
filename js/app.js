// Small UI behaviors, delegated on document so they keep working
// after the router swaps <main> content in and out.
(function () {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".nav-toggle");
    if (toggle) {
      document.body.classList.toggle("nav-open");
      return;
    }

    const cardTag = e.target.closest(".card-tag");
    if (cardTag) {
      const filter =
        cardTag.dataset.filter ||
        (cardTag.classList.contains("effects") ? "effects" :
         cardTag.classList.contains("synths") ? "synths" :
         cardTag.classList.contains("tools") ? "tools" :
         cardTag.classList.contains("archived") ? "archived" : null);
      if (filter) {
        const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        if (btn) btn.click();
      }
      return;
    }

    const filterBtn = e.target.closest(".filter-btn");
    if (filterBtn) {
      const group = filterBtn.closest(".filters");
      group
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.toggle("active", b === filterBtn));
      const filter = filterBtn.dataset.filter;
      // Plugin cards and news items carry data-category; legacy pages may use .category-block.
      document.querySelectorAll(".card[data-category], .category-block, .news-item, .archived-note").forEach((el) => {
        if (el.classList.contains("archived-note")) {
          el.style.display = filter === "archived" ? "" : "none";
        } else {
          el.style.display =
            filter === "all" || el.dataset.category === filter ? "" : "none";
        }
      });

      if (window.history && window.history.replaceState) {
        const pluginCategories = ["effects", "synths", "tools", "archived"];
        if (filter === "all") {
          if (location.hash && pluginCategories.includes(location.hash.slice(1))) {
            history.replaceState({}, "", location.pathname + location.search);
          }
        } else if (pluginCategories.includes(filter)) {
          history.replaceState({}, "", "#" + filter);
        }
      }
      return;
    }

    // On mobile the nav is a dropdown menu; tapping a parent dropdown
    // link should expand its panel instead of navigating.
    const ddLink = e.target.closest(".nav-dropdown > a");
    if (ddLink && document.body.classList.contains("nav-open")) {
      const dd = ddLink.closest(".nav-dropdown");
      if (!dd.classList.contains("open")) {
        e.preventDefault();
        dd.classList.add("open");
      }
    }

    // Close the mobile menu after a real navigation link is used.
    const navLink = e.target.closest(".nav-links a:not(.nav-dropdown > a)");
    if (navLink) {
      document.body.classList.remove("nav-open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const cardTag = e.target.closest(".card-tag");
      if (cardTag) {
        e.preventDefault();
        cardTag.click();
      }
    }
  });
})();
