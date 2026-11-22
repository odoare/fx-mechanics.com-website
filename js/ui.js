// Plugin-style knobs. A knob is drawn entirely in CSS from its --v custom
// property (0..1), so link knobs (the category counters on the home page)
// need no script at all. Knobs marked .knob-live are real controls: drag
// vertically, scroll, or use the arrow keys; double-click resets, as in the
// FX-Mechanics plugins. Everything is delegated on document so it keeps
// working after the router swaps <main>.
(function () {
  function num(el, key, fallback) {
    const v = parseFloat(el.dataset[key]);
    return isFinite(v) ? v : fallback;
  }

  function getValue(knob) {
    return num(knob, "value", num(knob, "min", 0));
  }

  function setValue(knob, value) {
    const min = num(knob, "min", 0);
    const max = num(knob, "max", 1);
    const v = Math.min(max, Math.max(min, value));
    const decimals = num(knob, "decimals", 2);
    if (knob.dataset.default === undefined) knob.dataset.default = knob.dataset.value;
    knob.dataset.value = String(v);
    knob.style.setProperty("--v", ((v - min) / (max - min)).toFixed(4));
    const text = v.toFixed(decimals) + (knob.dataset.unit || "");
    const out = knob.querySelector(".knob-value");
    if (out) out.textContent = text;
    knob.setAttribute("aria-valuemin", min);
    knob.setAttribute("aria-valuemax", max);
    knob.setAttribute("aria-valuenow", v);
    knob.setAttribute("aria-valuetext", text);
    applyKnob(knob.dataset.knob, v);
  }

  // What each named knob does. Only the chamber knobs exist for now.
  function applyKnob(name, v) {
    const chamber = document.querySelector(".chamber");
    if (!chamber) return;
    if (name === "speed") {
      chamber.querySelectorAll(".wave").forEach((w) => {
        if (!w.getAnimations) return;
        w.getAnimations().forEach((a) => (a.playbackRate = v));
      });
    } else if (name === "swell") {
      chamber.style.setProperty("--swell", v / 100);
    } else if (name === "absorb") {
      chamber.style.setProperty("--absorb", v / 100);
    }
  }

  function initKnobs(root) {
    root.querySelectorAll(".knob-live").forEach((k) => setValue(k, getValue(k)));
  }

  // ----- drag -----
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const knob = e.target.closest(".knob-live");
    if (!knob || e.button !== 0) return;
    e.preventDefault();
    knob.focus();
    knob.setPointerCapture(e.pointerId);
    drag = { knob, y: e.clientY, start: getValue(knob) };
    knob.classList.add("is-dragging");
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const { knob } = drag;
    const range = num(knob, "max", 1) - num(knob, "min", 0);
    const fine = e.shiftKey ? 0.2 : 1; // shift = fine adjust, as in JUCE
    setValue(knob, drag.start + ((drag.y - e.clientY) / 180) * range * fine);
  });
  function endDrag() {
    if (!drag) return;
    drag.knob.classList.remove("is-dragging");
    drag = null;
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  // ----- wheel / keys / reset -----
  document.addEventListener(
    "wheel",
    (e) => {
      const knob = e.target.closest(".knob-live");
      if (!knob) return;
      e.preventDefault();
      const range = num(knob, "max", 1) - num(knob, "min", 0);
      setValue(knob, getValue(knob) - Math.sign(e.deltaY) * range * 0.03);
    },
    { passive: false }
  );
  document.addEventListener("keydown", (e) => {
    const knob = e.target.closest && e.target.closest(".knob-live");
    if (!knob) return;
    const range = num(knob, "max", 1) - num(knob, "min", 0);
    const step = range * (e.shiftKey ? 0.01 : 0.05);
    const map = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step };
    if (e.key in map) {
      e.preventDefault();
      setValue(knob, getValue(knob) + map[e.key]);
    } else if (e.key === "Home") {
      setValue(knob, num(knob, "min", 0));
    } else if (e.key === "End") {
      setValue(knob, num(knob, "max", 1));
    }
  });
  document.addEventListener("dblclick", (e) => {
    const knob = e.target.closest(".knob-live");
    if (knob) setValue(knob, num(knob, "default", getValue(knob)));
  });

  // Re-initialise whenever the router puts a new <main> in place.
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.tagName === "MAIN") initKnobs(n);
      });
    }
  }).observe(document.body, { childList: true });

  initKnobs(document);
})();
