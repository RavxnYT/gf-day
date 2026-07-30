(() => {
  const cfg = window.GF_DAY || {};
  const herName = cfg.herName || "My Love";
  const yourName = cfg.yourName || "Me";
  const letterText = cfg.letter || "";
  const reasons = cfg.reasons || [];
  const moments = cfg.moments || [];

  // Fill content from config
  const nameEl = document.getElementById("gf-name");
  const fromEl = document.getElementById("from-name");
  const yearEl = document.getElementById("year");
  if (nameEl) nameEl.textContent = herName;
  if (fromEl) fromEl.textContent = yourName;
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Reasons list
  const reasonsList = document.getElementById("reasons-list");
  if (reasonsList) {
    reasons.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "reasons__item";
      li.style.transitionDelay = `${i * 0.08}s`;
      li.innerHTML = `<p>${escapeHtml(text)}</p>`;
      reasonsList.appendChild(li);
    });
  }

  // Moments
  const momentsRail = document.getElementById("moments-rail");
  if (momentsRail) {
    moments.forEach((m, i) => {
      const article = document.createElement("article");
      article.className = "moment";
      article.style.transitionDelay = `${(i % 2) * 0.12}s`;
      article.innerHTML = `
        <h3 class="moment__title">${escapeHtml(m.title)}</h3>
        <p class="moment__text">${escapeHtml(m.text)}</p>
      `;
      momentsRail.appendChild(article);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Floating hearts canvas ─────────────────────────
  const canvas = document.getElementById("hearts-canvas");
  const ctx = canvas?.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hearts = [];
  let animId = 0;
  let W = 0;
  let H = 0;

  function resize() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function spawnHeart(force = false) {
    const count = force ? 1 : hearts.length < maxHearts() ? 1 : 0;
    if (!count) return;
    const size = 8 + Math.random() * 18;
    hearts.push({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 20 + Math.random() * 40,
      size,
      speed: 0.35 + Math.random() * 1.1,
      sway: 0.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.45,
      spin: (Math.random() - 0.5) * 0.02,
      rot: Math.random() * Math.PI,
      hue: Math.random() > 0.5 ? 340 : 350,
    });
  }

  function maxHearts() {
    if (window.innerWidth < 480) return 22;
    if (window.innerWidth < 900) return 36;
    return 48;
  }

  function drawHeartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
    c.bezierCurveTo(x - s / 2, y + s * 0.7, x, y + s * 0.95, x, y + s * 1.25);
    c.bezierCurveTo(x, y + s * 0.95, x + s / 2, y + s * 0.7, x + s / 2, y + s * 0.3);
    c.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
    c.closePath();
  }

  function tickHearts() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (!reducedMotion && Math.random() < 0.35) spawnHeart();

    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.phase += 0.02;
      h.y -= h.speed;
      h.x += Math.sin(h.phase) * h.sway * 0.35;
      h.rot += h.spin;

      if (h.y < -40) {
        hearts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.globalAlpha = h.alpha;
      drawHeartPath(ctx, 0, -h.size * 0.5, h.size * 0.55);
      ctx.fillStyle = `hsla(${h.hue}, 72%, 58%, 1)`;
      ctx.fill();
      ctx.restore();
    }

    animId = requestAnimationFrame(tickHearts);
  }

  if (canvas && ctx && !reducedMotion) {
    resize();
    for (let i = 0; i < maxHearts(); i++) {
      spawnHeart(true);
      hearts[i].y = Math.random() * window.innerHeight;
    }
    window.addEventListener("resize", resize);
    tickHearts();
  }

  // ── Gate open ──────────────────────────────────────
  const gate = document.getElementById("gate");
  const openBtn = document.getElementById("open-letter");
  const story = document.getElementById("story");
  let opened = false;

  function openStory() {
    if (opened) return;
    opened = true;
    gate?.classList.add("is-gone");
    story?.classList.remove("is-locked");
    story?.classList.add("is-open");
    story?.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-unlocked");

    // Seed a burst of hearts
    if (!reducedMotion) {
      for (let i = 0; i < 18; i++) setTimeout(() => spawnHeart(true), i * 40);
    }

    // Kick reveals already in view
    requestAnimationFrame(() => {
      observeReveals();
      startTypewriterWhenReady();
    });
  }

  openBtn?.addEventListener("click", openStory);
  openBtn?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openStory();
    }
  });

  // ── Scroll reveals ─────────────────────────────────
  let observer;

  function observeReveals() {
    const targets = document.querySelectorAll(
      ".reveal, .reasons__item, .moment"
    );

    if (reducedMotion) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((el) => observer.observe(el));

    // Stagger hero reveals manually
    document.querySelectorAll(".hero .reveal").forEach((el, i) => {
      el.classList.add(`delay-${Math.min(i + 1, 4)}`);
      setTimeout(() => el.classList.add("is-visible"), 200 + i * 160);
    });
  }

  // ── Typewriter ─────────────────────────────────────
  const typeEl = document.getElementById("typewriter");
  let typingStarted = false;

  function startTypewriterWhenReady() {
    if (!typeEl || typingStarted) return;

    if (reducedMotion) {
      typeEl.textContent = letterText;
      typingStarted = true;
      return;
    }

    const letterSection = document.getElementById("letter");
    const typeObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          typeObserver.disconnect();
          runTypewriter();
        }
      },
      { threshold: 0.35 }
    );
    if (letterSection) typeObserver.observe(letterSection);
  }

  function runTypewriter() {
    if (!typeEl || typingStarted) return;
    typingStarted = true;
    typeEl.innerHTML = '<span class="cursor"></span>';
    const cursor = typeEl.querySelector(".cursor");
    let i = 0;

    function step() {
      if (i >= letterText.length) {
        // Keep soft blink briefly then leave cursor
        return;
      }
      const ch = letterText[i];
      typeEl.insertBefore(document.createTextNode(ch), cursor);
      i += 1;
      const delay = ch === "\n" ? 180 : ch === "." || ch === "!" || ch === "?" ? 70 : 18 + Math.random() * 22;
      setTimeout(step, delay);
    }

    setTimeout(step, 400);
  }

  // ── Heart burst button ─────────────────────────────
  const burstBtn = document.getElementById("heart-burst");
  const burstLayer = document.getElementById("burst-layer");

  burstBtn?.addEventListener("click", () => {
    if (!burstLayer) return;
    const count = reducedMotion ? 6 : 28;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement("span");
      heart.className = "burst-heart";
      heart.textContent = "♥";
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 120 + Math.random() * 220;
      heart.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      heart.style.setProperty("--ty", `${Math.sin(angle) * dist - 80}px`);
      heart.style.setProperty("--rot", `${(Math.random() - 0.5) * 80}deg`);
      heart.style.fontSize = `${0.9 + Math.random() * 1.4}rem`;
      heart.style.color = Math.random() > 0.4 ? "#e8437a" : "#c42d5c";
      burstLayer.appendChild(heart);
      setTimeout(() => heart.remove(), 1700);
    }

    if (!reducedMotion) {
      for (let i = 0; i < 20; i++) setTimeout(() => spawnHeart(true), i * 30);
    }

    burstBtn.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.12)" },
        { transform: "scale(1)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
  });
})();
