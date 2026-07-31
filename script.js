(() => {
  const cfg = window.GF_DAY || {};
  const herName = cfg.herName || "Lynn";
  const yourName = cfg.yourName || "Joe";
  const letterText = cfg.letter || "";
  const reasons = cfg.reasons || [];
  const moments = cfg.moments || [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nameEl = document.getElementById("gf-name");
  const fromEl = document.getElementById("from-name");
  if (nameEl) nameEl.textContent = herName;
  if (fromEl) fromEl.textContent = yourName;

  const heartSvg = `<svg class="reasons__heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.5-7.2-10A4 4 0 0 1 12 7.2 4 4 0 0 1 19.2 11c0 5.5-7.2 10-7.2 10z"/></svg>`;

  const reasonsList = document.getElementById("reasons-list");
  if (reasonsList) {
    reasons.forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "reasons__item";
      li.style.transitionDelay = `${i * 0.07}s`;
      li.innerHTML = `<p>${escapeHtml(text)}</p>${heartSvg}`;
      reasonsList.appendChild(li);
    });
  }

  const momentsRail = document.getElementById("moments-rail");
  if (momentsRail) {
    moments.forEach((m, i) => {
      const article = document.createElement("article");
      article.className = "moment";
      article.style.transitionDelay = `${i * 0.1}s`;
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

  // ── Rich particle field ────────────────────────────
  const canvas = document.getElementById("hearts-canvas");
  const ctx = canvas?.getContext("2d");
  let particles = [];

  function resize() {
    if (!canvas || !ctx) return;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function maxParticles() {
    if (window.innerWidth < 480) return 34;
    if (window.innerWidth < 900) return 55;
    return 72;
  }

  function spawnParticle(force = false, burst = false) {
    if (!force && particles.length >= maxParticles()) return;

    const kind = Math.random();
    const type = kind < 0.62 ? "heart" : kind < 0.86 ? "petal" : "spark";
    const size =
      type === "spark"
        ? 1.5 + Math.random() * 2.5
        : type === "petal"
          ? 6 + Math.random() * 10
          : 8 + Math.random() * 20;

    particles.push({
      type,
      x: burst
        ? window.innerWidth * 0.5 + (Math.random() - 0.5) * 120
        : Math.random() * window.innerWidth,
      y: burst
        ? window.innerHeight * 0.55 + (Math.random() - 0.5) * 80
        : window.innerHeight + 20 + Math.random() * 60,
      size,
      speed: burst ? 1.5 + Math.random() * 3 : 0.3 + Math.random() * 1.25,
      sway: 0.35 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      alpha: type === "spark" ? 0.5 + Math.random() * 0.5 : 0.22 + Math.random() * 0.5,
      spin: (Math.random() - 0.5) * 0.04,
      rot: Math.random() * Math.PI,
      hue: 330 + Math.random() * 30,
      vx: burst ? (Math.random() - 0.5) * 6 : 0,
      vy: burst ? -2 - Math.random() * 5 : 0,
      life: burst ? 1 : null,
    });
  }

  function drawHeart(c, s) {
    c.beginPath();
    c.moveTo(0, s * 0.3);
    c.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, s * 0.3);
    c.bezierCurveTo(-s / 2, s * 0.7, 0, s * 0.95, 0, s * 1.25);
    c.bezierCurveTo(0, s * 0.95, s / 2, s * 0.7, s / 2, s * 0.3);
    c.bezierCurveTo(s / 2, 0, 0, 0, 0, s * 0.3);
    c.closePath();
  }

  function tickParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (!reducedMotion && Math.random() < 0.45) spawnParticle();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.phase += 0.018 + p.sway * 0.004;
      p.rot += p.spin;

      if (p.life != null) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.99;
        p.life -= 0.012;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
      } else {
        p.y -= p.speed;
        p.x += Math.sin(p.phase) * p.sway * 0.4;
        if (p.y < -50) {
          particles.splice(i, 1);
          continue;
        }
      }

      const a = p.life != null ? p.alpha * p.life : p.alpha;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;

      if (p.type === "spark") {
        ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, 1)`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "petal") {
        ctx.fillStyle = `hsla(${p.hue}, 70%, 72%, 1)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.35, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `hsla(${p.hue}, 75%, 58%, 1)`;
        drawHeart(ctx, p.size * 0.55);
        ctx.fill();
      }
      ctx.restore();
    }

    requestAnimationFrame(tickParticles);
  }

  function burstParticles(n = 28) {
    for (let i = 0; i < n; i++) spawnParticle(true, true);
  }

  if (canvas && ctx && !reducedMotion) {
    resize();
    for (let i = 0; i < maxParticles(); i++) {
      spawnParticle(true);
      particles[i].y = Math.random() * window.innerHeight;
    }
    window.addEventListener("resize", resize);
    tickParticles();
  }

  // ── Gate open → quiz → story ───────────────────────
  const gate = document.getElementById("gate");
  const openBtn = document.getElementById("open-letter");
  const story = document.getElementById("story");
  const unlockEl = document.getElementById("unlock");
  let sealOpened = false;
  let unlocked = false;

  const unlockCfg = cfg.unlock || {};
  const answers = {
    nickname: normalizeText(unlockCfg.nickname || "bibi"),
    askDate: String(unlockCfg.askDate || "2024-02-14"),
    fillBlank: normalizeText(unlockCfg.fillBlank || "everything"),
  };

  function normalizeText(str) {
    return String(str).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function openSeal() {
    if (sealOpened) return;
    sealOpened = true;
    gate?.classList.add("is-opening");

    setTimeout(() => {
      gate?.classList.add("is-gone");
      showUnlock();
      if (!reducedMotion) burstParticles(18);
    }, reducedMotion ? 0 : 380);
  }

  function showUnlock() {
    if (!unlockEl) return;
    unlockEl.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      unlockEl.classList.add("is-open");
      unlockEl.scrollTop = 0;
    });
    document.getElementById("q1-input")?.focus({ preventScroll: true });
  }

  function revealStory() {
    if (unlocked) return;
    unlocked = true;
    unlockEl?.classList.add("is-gone");
    document.body.style.overflow = "";
    setTimeout(() => {
      if (unlockEl) unlockEl.hidden = true;
    }, 700);

    story?.classList.remove("is-locked");
    story?.classList.add("is-open");
    story?.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-unlocked");

    if (!reducedMotion) burstParticles(40);

    requestAnimationFrame(() => {
      observeReveals();
      startTypewriterWhenReady();
    });
  }

  openBtn?.addEventListener("click", openSeal);

  // ── Unlock quiz steps ──────────────────────────────
  let step = 0;
  const forms = [
    document.getElementById("q1-form"),
    document.getElementById("q2-form"),
    document.getElementById("q3-form"),
  ];
  const stepLabel = document.getElementById("unlock-step");
  const dots = document.querySelectorAll(".unlock__dot");

  function setStep(next) {
    step = next;
    forms.forEach((form, i) => {
      if (!form) return;
      const active = i === step;
      form.hidden = !active;
      form.classList.toggle("is-active", active);
      form.classList.remove("is-wrong");
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === step);
      dot.classList.toggle("is-done", i < step);
    });
    if (stepLabel) stepLabel.textContent = `Question ${step + 1} of 3`;

    if (unlockEl) unlockEl.scrollTop = 0;

    if (step === 0) document.getElementById("q1-input")?.focus({ preventScroll: true });
    if (step === 2) document.getElementById("q3-input")?.focus({ preventScroll: true });
  }

  function showError(id, form) {
    const err = document.getElementById(id);
    if (err) {
      err.hidden = false;
      err.classList.remove("is-shake");
      void err.offsetWidth;
      err.classList.add("is-shake");
    }
    form?.classList.remove("is-wrong");
    void form?.offsetWidth;
    form?.classList.add("is-wrong");
  }

  function hideError(id, form) {
    const err = document.getElementById(id);
    if (err) err.hidden = true;
    form?.classList.remove("is-wrong");
  }

  document.getElementById("q1-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("q1-input");
    const value = normalizeText(input?.value || "");
    if (value === answers.nickname) {
      hideError("q1-error", forms[0]);
      if (!reducedMotion) burstParticles(12);
      setStep(1);
    } else {
      showError("q1-error", forms[0]);
      input?.select();
    }
  });

  document.getElementById("q2-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = document.getElementById("q2-input")?.value || "";
    if (value === answers.askDate) {
      hideError("q2-error", forms[1]);
      if (!reducedMotion) burstParticles(12);
      setStep(2);
    } else {
      showError("q2-error", forms[1]);
    }
  });

  document.getElementById("q3-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("q3-input");
    const value = normalizeText(input?.value || "");
    if (value === answers.fillBlank) {
      hideError("q3-error", forms[2]);
      revealStory();
    } else {
      showError("q3-error", forms[2]);
      input?.select();
    }
  });

  // ── Professional calendar ──────────────────────────
  const calGrid = document.getElementById("cal-grid");
  const calMonth = document.getElementById("cal-month");
  const calSelected = document.getElementById("cal-selected");
  const q2Input = document.getElementById("q2-input");
  const q2Submit = document.getElementById("q2-submit");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Start calendar near the correct answer month
  const answerParts = answers.askDate.split("-").map(Number);
  let viewYear = answerParts[0] || new Date().getFullYear();
  let viewMonth = (answerParts[1] || 1) - 1;
  let selectedISO = "";

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISO(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  function formatPretty(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function renderCalendar() {
    if (!calGrid || !calMonth) return;
    calMonth.textContent = `${monthNames[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = "";

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = 0; i < 42; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal__day";

      let dayNum;
      let inMonth = true;
      let y = viewYear;
      let m = viewMonth;

      if (i < firstDay) {
        dayNum = prevDays - firstDay + 1 + i;
        inMonth = false;
        m = viewMonth - 1;
        if (m < 0) {
          m = 11;
          y -= 1;
        }
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - (firstDay + daysInMonth) + 1;
        inMonth = false;
        m = viewMonth + 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      } else {
        dayNum = i - firstDay + 1;
      }

      const iso = toISO(y, m, dayNum);
      btn.textContent = String(dayNum);
      btn.dataset.date = iso;

      if (!inMonth) btn.disabled = true;
      if (iso === todayISO && inMonth) btn.classList.add("is-today");
      if (iso === selectedISO) btn.classList.add("is-selected");

      if (inMonth) {
        btn.addEventListener("click", () => selectDate(iso));
      }

      calGrid.appendChild(btn);
    }
  }

  function selectDate(iso) {
    selectedISO = iso;
    if (q2Input) q2Input.value = iso;
    if (q2Submit) q2Submit.disabled = false;
    if (calSelected) {
      calSelected.textContent = formatPretty(iso);
      calSelected.classList.add("has-value");
    }
    hideError("q2-error", forms[1]);
    renderCalendar();
  }

  document.getElementById("cal-prev")?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  document.getElementById("cal-next")?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  renderCalendar();

  // ── Scroll reveals ─────────────────────────────────
  let observer;

  function observeReveals() {
    const targets = document.querySelectorAll(".reveal, .reasons__item, .moment");

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
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((el) => {
      if (!el.closest(".hero")) observer.observe(el);
    });

    document.querySelectorAll(".hero .reveal").forEach((el, i) => {
      setTimeout(() => el.classList.add("is-visible"), 180 + i * 170);
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
      { threshold: 0.3 }
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
      if (i >= letterText.length) return;
      const ch = letterText[i];
      typeEl.insertBefore(document.createTextNode(ch), cursor);
      i += 1;
      const delay =
        ch === "\n"
          ? 160
          : ch === "." || ch === "!" || ch === "?"
            ? 65
            : 14 + Math.random() * 18;
      setTimeout(step, delay);
    }

    setTimeout(step, 350);
  }

  // ── Hold-to-love heart ─────────────────────────────
  const loveBtn = document.getElementById("love-hold");
  const loveFill = document.getElementById("love-fill");
  const lovePct = document.getElementById("love-pct");
  const loveMsg = document.getElementById("love-msg");
  let love = 0;
  let holding = false;
  let loveRaf = 0;
  let completed = false;

  const loveMessages = [
    { at: 0, text: "Hold me…" },
    { at: 20, text: "A little more…" },
    { at: 45, text: "Yes… just like that" },
    { at: 70, text: "Almost infinity…" },
    { at: 100, text: "This much. Forever." },
  ];

  function setLoveMsg(pct) {
    if (!loveMsg) return;
    let next = loveMessages[0].text;
    for (const m of loveMessages) {
      if (pct >= m.at) next = m.text;
    }
    if (loveMsg.textContent !== next) {
      loveMsg.textContent = next;
      loveMsg.classList.remove("is-pop");
      void loveMsg.offsetWidth;
      loveMsg.classList.add("is-pop");
    }
  }

  function updateLoveVisual() {
    if (loveFill) loveFill.setAttribute("y", String(64 - (love / 100) * 64));
    if (lovePct) lovePct.textContent = `${Math.round(love)}%`;
    setLoveMsg(love);
  }

  function loveLoop() {
    if (holding && love < 100) {
      love = Math.min(100, love + 0.85);
      updateLoveVisual();
      if (love >= 100 && !completed) {
        completed = true;
        loveBtn?.classList.add("is-full");
        if (!reducedMotion) {
          burstParticles(50);
          spawnDomBurst(36);
        }
      }
    } else if (!holding && love > 0 && love < 100) {
      love = Math.max(0, love - 0.55);
      updateLoveVisual();
    }

    if ((holding && love < 100) || (!holding && love > 0 && love < 100)) {
      loveRaf = requestAnimationFrame(loveLoop);
    } else {
      loveRaf = 0;
    }
  }

  function startHold(e) {
    e.preventDefault();
    if (completed) {
      if (!reducedMotion) {
        burstParticles(24);
        spawnDomBurst(20);
      }
      return;
    }
    holding = true;
    loveBtn?.classList.add("is-holding");
    if (!loveRaf) loveRaf = requestAnimationFrame(loveLoop);
  }

  function endHold() {
    holding = false;
    loveBtn?.classList.remove("is-holding");
    if (!loveRaf && love > 0 && love < 100) loveRaf = requestAnimationFrame(loveLoop);
  }

  if (loveBtn) {
    loveBtn.addEventListener("pointerdown", startHold);
    loveBtn.addEventListener("pointerup", endHold);
    loveBtn.addEventListener("pointerleave", endHold);
    loveBtn.addEventListener("pointercancel", endHold);
  }

  // ── Heart storm button ─────────────────────────────
  const burstBtn = document.getElementById("heart-burst");
  const burstLayer = document.getElementById("burst-layer");

  function spawnDomBurst(count, originY = 0.22) {
    if (!burstLayer) return;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement("span");
      heart.className = "burst-heart";
      heart.textContent = "♥";
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 140 + Math.random() * 260;
      heart.style.bottom = `${originY * 100}%`;
      heart.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      heart.style.setProperty("--ty", `${Math.sin(angle) * dist - 100}px`);
      heart.style.setProperty("--rot", `${(Math.random() - 0.5) * 100}deg`);
      heart.style.fontSize = `${0.85 + Math.random() * 1.6}rem`;
      heart.style.color = Math.random() > 0.35 ? "#f06292" : "#c2185b";
      burstLayer.appendChild(heart);
      setTimeout(() => heart.remove(), 1800);
    }
  }

  burstBtn?.addEventListener("click", () => {
    const count = reducedMotion ? 10 : 42;
    spawnDomBurst(count);
    if (!reducedMotion) burstParticles(36);
    burstBtn.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-4px) scale(1.06)" },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" }
    );
  });

  // ── Cursor heart trail ─────────────────────────────
  const trailLayer = document.getElementById("cursor-hearts");
  let lastTrail = 0;

  if (trailLayer && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (!unlocked) return;
        const now = performance.now();
        if (now - lastTrail < 55) return;
        lastTrail = now;

        const el = document.createElement("span");
        el.className = "trail-heart";
        el.textContent = "♥";
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        el.style.fontSize = `${0.55 + Math.random() * 0.7}rem`;
        trailLayer.appendChild(el);
        setTimeout(() => el.remove(), 950);
      },
      { passive: true }
    );
  }

  // ── Secret naughty ticket ──────────────────────────
  const ticketCfg = cfg.secretTicket || {};
  const secretBtn = document.getElementById("secret-ticket-btn");
  const ticketModal = document.getElementById("secret-ticket");
  const ticketPerks = document.getElementById("ticket-perks");

  const ticketName = document.getElementById("ticket-name");
  const ticketDate = document.getElementById("ticket-date");
  const ticketTitle = document.getElementById("ticket-title");
  const ticketSub = document.getElementById("ticket-sub");
  const ticketFine = document.getElementById("ticket-fine");

  if (ticketName) ticketName.textContent = herName;
  if (ticketDate) ticketDate.textContent = ticketCfg.dateLabel || "August 3";
  if (ticketTitle) ticketTitle.textContent = ticketCfg.title || "VIP Night Pass";
  if (ticketSub) ticketSub.textContent = ticketCfg.subtitle || "";
  if (ticketFine) ticketFine.textContent = ticketCfg.finePrint || "";

  if (ticketPerks && Array.isArray(ticketCfg.perks)) {
    ticketPerks.innerHTML = ticketCfg.perks
      .map((p) => `<li>${escapeHtml(p)}</li>`)
      .join("");
  }

  function openTicket() {
    if (!unlocked || !ticketModal) return;
    ticketModal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      ticketModal.classList.add("is-open");
      ticketModal.scrollTop = 0;
    });
    document.getElementById("ticket-close")?.focus({ preventScroll: true });
    if (!reducedMotion) burstParticles(30);
  }

  function closeTicket() {
    if (!ticketModal) return;
    ticketModal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      ticketModal.hidden = true;
    }, 400);
  }

  secretBtn?.addEventListener("click", openTicket);
  document.getElementById("ticket-close")?.addEventListener("click", closeTicket);
  document.getElementById("ticket-close-scrim")?.addEventListener("click", closeTicket);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ticketModal && !ticketModal.hidden) closeTicket();
  });
})();
