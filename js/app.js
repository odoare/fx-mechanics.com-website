// Small UI behaviors, delegated on document so they keep working
// after the router swaps <main> content in and out.
(function () {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".nav-toggle");
    if (toggle) {
      document.body.classList.toggle("nav-open");
      return;
    }

    const filterBtn = e.target.closest(".filter-btn");
    if (filterBtn) {
      const group = filterBtn.closest(".filters");
      group
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.toggle("active", b === filterBtn));
      const filter = filterBtn.dataset.filter;
      document.querySelectorAll(".category-block").forEach((block) => {
        block.style.display =
          filter === "all" || block.dataset.category === filter ? "" : "none";
      });
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
})();
