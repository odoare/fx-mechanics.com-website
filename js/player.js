// Sticky header audio player. Lives in the header markup, which is
// never touched by the router, so playback survives page navigation.
// A tiny localStorage record lets it also resume near where it left
// off after a hard reload (subject to the browser's autoplay policy).
(function () {
  if (window.__fxPlayerInit) return;
  window.__fxPlayerInit = true;

  const PLAYLIST = [
    { title: "H2O2", artist: "Y'n'N / H2O2", src: "audio/001-H2O2.mp3" },
    { title: "The Sign Of The Beast", artist: "Y'n'N / H2O2", src: "audio/002-SignOfTheBeast.mp3" },
    { title: "Reboot", artist: "Y'n'N / H2O2", src: "audio/011-Reboot.mp3" },
    { title: "Impossible Peace", artist: "Y'n'N / H2O2", src: "audio/012-ImpossiblePeace.mp3" },
  ];
  const STORAGE_KEY = "fx-player-state-v1";

  const audio = document.getElementById("fx-audio");
  if (!audio) return;

  const playBtn = document.querySelector(".player-btn.play");
  const prevBtn = document.querySelector(".player-btn.prev");
  const nextBtn = document.querySelector(".player-btn.next");
  const range = document.querySelector(".player-range");
  const curTimeEl = document.querySelector(".player-time.cur");
  const endTimeEl = document.querySelector(".player-time.end");
  const trackEl = document.querySelector(".player-meta .track");
  const artistEl = document.querySelector(".player-meta .artist");

  let index = 0;
  let isDragging = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        index,
        time: audio.currentTime || 0,
        playing: !audio.paused,
      })
    );
  }

  function setPlayingUI(playing) {
    playBtn.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    document.body.classList.toggle("is-playing", playing);
    if (playing) startMeter();
  }

  // ----- L/R level meter in the top bar -----
  // The Web Audio graph is built on the first click of Play (a user gesture),
  // never on an autoplay resume: a MediaElementSource routes the <audio>
  // through the AudioContext, and a context the browser left suspended would
  // silence the music. Without a graph the meter simply stays at rest.
  const meterFills = document.querySelectorAll(".player-meter .meter-fill");
  let analysers = null;
  let meterRaf = 0;

  function buildGraph() {
    if (analysers || !window.AudioContext || !meterFills.length) return;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const split = ctx.createChannelSplitter(2);
      analysers = [ctx.createAnalyser(), ctx.createAnalyser()];
      src.connect(ctx.destination);
      src.connect(split);
      analysers.forEach((a, i) => {
        a.fftSize = 1024;
        split.connect(a, i);
      });
      analysers.ctx = ctx;
      analysers.buf = new Float32Array(1024);
      analysers.level = [0, 0];
    } catch (e) {
      analysers = null;
    }
  }

  function startMeter() {
    if (!analysers || meterRaf) return;
    const tick = () => {
      analysers.forEach((a, i) => {
        a.getFloatTimeDomainData(analysers.buf);
        let peak = 0;
        for (let k = 0; k < analysers.buf.length; k++) peak = Math.max(peak, Math.abs(analysers.buf[k]));
        const db = peak > 0 ? 20 * Math.log10(peak) : -60;
        const target = Math.max(0, Math.min(1, (db + 48) / 48)); // -48..0 dBFS
        // fast attack, slow release, like the plugins' meters
        const prev = analysers.level[i];
        analysers.level[i] = target > prev ? target : prev * 0.92 + target * 0.08;
        meterFills[i].style.transform = "scaleX(" + analysers.level[i].toFixed(3) + ")";
      });
      if (audio.paused && analysers.level[0] < 0.01 && analysers.level[1] < 0.01) {
        meterRaf = 0;
        return;
      }
      meterRaf = requestAnimationFrame(tick);
    };
    meterRaf = requestAnimationFrame(tick);
  }

  function loadTrack(i, { autoplay = false, resumeTime = 0 } = {}) {
    index = (i + PLAYLIST.length) % PLAYLIST.length;
    const t = PLAYLIST[index];
    audio.src = t.src;
    trackEl.textContent = t.title;
    artistEl.textContent = t.artist;
    range.value = 0;
    range.style.setProperty("--fill", "0%");
    curTimeEl.textContent = "0:00";
    endTimeEl.textContent = "0:00";

    if (resumeTime) {
      audio.addEventListener(
        "loadedmetadata",
        function once() {
          audio.currentTime = resumeTime;
          audio.removeEventListener("loadedmetadata", once);
        },
        { once: true }
      );
    }
    if (autoplay) {
      audio.play().catch(() => {});
    }
  }

  const initial = loadState();
  index = Number.isInteger(initial.index) ? initial.index : 0;
  loadTrack(index, { resumeTime: initial.time || 0 });
  setPlayingUI(false);

  if (initial.playing) {
    audio.addEventListener(
      "canplay",
      function once() {
        audio.play().catch(() => {});
        audio.removeEventListener("canplay", once);
      },
      { once: true }
    );
  }

  playBtn.addEventListener("click", () => {
    buildGraph();
    if (analysers && analysers.ctx.state === "suspended") analysers.ctx.resume();
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  prevBtn.addEventListener("click", () => {
    const wasPlaying = !audio.paused;
    loadTrack(index - 1, { autoplay: wasPlaying });
  });
  nextBtn.addEventListener("click", () => {
    const wasPlaying = !audio.paused;
    loadTrack(index + 1, { autoplay: wasPlaying });
  });

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));
  audio.addEventListener("ended", () => loadTrack(index + 1, { autoplay: true }));

  audio.addEventListener("loadedmetadata", () => {
    endTimeEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!isDragging) {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      range.value = pct;
      range.style.setProperty("--fill", pct + "%");
    }
    curTimeEl.textContent = fmt(audio.currentTime);
    saveState();
  });

  range.addEventListener("input", () => {
    isDragging = true;
    range.style.setProperty("--fill", range.value + "%");
    curTimeEl.textContent = fmt((range.value / 100) * (audio.duration || 0));
  });
  range.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = (range.value / 100) * audio.duration;
    isDragging = false;
  });

  window.addEventListener("beforeunload", saveState);
  setInterval(saveState, 4000);
})();
