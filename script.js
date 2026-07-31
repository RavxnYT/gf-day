(() => {
  const cfg = window.GF_DAY || {};
  const herName = cfg.herName || "Lynn";
  const yourName = cfg.yourName || "Joe";
  const letterText = cfg.letter || "";
  const reasons = cfg.reasons || [];
  const moments = cfg.moments || [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Date lock: 1 August 2026, Asia/Beirut (internet unix time) ──
  const release = cfg.releaseDate || { year: 2026, month: 8, day: 1 };
  const timeZone = cfg.timeZone || "Asia/Beirut";
  const waitEl = document.getElementById("wait");
  const gateEl = document.getElementById("gate");
  const waitSub = document.getElementById("wait-sub");
  const waitStatus = document.getElementById("wait-status");
  const waitCountdown = document.getElementById("wait-countdown");

  // Anchored to performance.now() so changing the phone clock can't fake it
  let timeAnchor = null; // { unixMs, perf }
  let countdownTimer = null;
  let refreshTimer = null;
  let siteOpened = false;

  // Beirut summer offset (EEST). Aug 1 is always in this window for Lebanon.
  function releaseStartMs() {
    return Date.parse(
      `${release.year}-${String(release.month).padStart(2, "0")}-${String(release.day).padStart(2, "0")}T00:00:00+03:00`
    );
  }

  function releaseEndMs() {
    return releaseStartMs() + 24 * 60 * 60 * 1000;
  }

  function trueNowMs() {
    if (!timeAnchor) return null;
    const ms = timeAnchor.unixMs + (performance.now() - timeAnchor.perf);
    return Number.isFinite(ms) ? ms : null;
  }

  function isSaneUnix(ms) {
    if (!Number.isFinite(ms)) return false;
    // Must be a real 2026 timestamp — rejects NaN / epoch / garbage parses (Android bug)
    const min = Date.parse("2026-06-01T00:00:00+03:00");
    const max = Date.parse("2026-12-31T23:59:59+03:00");
    return ms >= min && ms <= max;
  }

  function beirutParts(ms) {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(new Date(ms));

      const get = (type) => {
        const raw = parts.find((p) => p.type === type)?.value;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      };
      return { year: get("year"), month: get("month"), day: get("day") };
    } catch {
      return { year: null, month: null, day: null };
    }
  }

  // Strict: only open inside the Beirut Aug 1 unix window (works on Android + iOS)
  function isReleaseDay() {
    if (cfg.forceOpen === true) return true;
    const ms = trueNowMs();
    if (ms == null || !isSaneUnix(ms)) return false;

    // Primary gate — absolute Beirut midnight window (no Intl needed)
    if (ms < releaseStartMs() || ms >= releaseEndMs()) return false;

    // Secondary check via timezone formatter when available
    const p = beirutParts(ms);
    if (p.year == null || p.month == null || p.day == null) {
      // Intl failed — still allow if unix window matched
      return true;
    }
    return (
      p.year === release.year &&
      p.month === release.month &&
      p.day === release.day
    );
  }

  function fetchWithTimeout(url, ms = 8000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ctrl.signal }).finally(() =>
      clearTimeout(timer)
    );
  }

  function fromBeirutWallClock(y, m, d, h, min, s) {
    // Interpret wall clock as Beirut GMT+3 (safe for Aug / summer)
    const ms = Date.parse(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}+03:00`
    );
    if (!isSaneUnix(ms)) throw new Error("insane wall clock");
    return ms;
  }

  async function fetchBeirutUnixMs() {
    const tryWorldTime = async () => {
      const res = await fetchWithTimeout(
        `https://worldtimeapi.org/api/timezone/${encodeURIComponent(timeZone)}`
      );
      if (!res.ok) throw new Error("worldtimeapi failed");
      const data = await res.json();
      if (typeof data.unixtime === "number" && isSaneUnix(data.unixtime * 1000)) {
        return data.unixtime * 1000;
      }
      // Fallback: API's own calendar fields (Beirut) + time fields
      if (data.year && data.month && data.day) {
        const datetime = String(data.datetime || "");
        const timeBit = datetime.match(/T(\d{2}):(\d{2}):(\d{2})/);
        const hh = timeBit ? Number(timeBit[1]) : 12;
        const mm = timeBit ? Number(timeBit[2]) : 0;
        const ss = timeBit ? Number(timeBit[3]) : 0;
        return fromBeirutWallClock(data.year, data.month, data.day, hh, mm, ss);
      }
      throw new Error("worldtimeapi bad payload");
    };

    const tryTimeApi = async () => {
      const res = await fetchWithTimeout(
        `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(timeZone)}`
      );
      if (!res.ok) throw new Error("timeapi failed");
      const data = await res.json();
      // Prefer numeric fields — avoids Android Date.parse quirks on long fractions
      if (data.year && data.month && data.day != null) {
        return fromBeirutWallClock(
          Number(data.year),
          Number(data.month),
          Number(data.day),
          Number(data.hour || 0),
          Number(data.minute || 0),
          Number(data.seconds != null ? data.seconds : data.second || 0)
        );
      }
      throw new Error("timeapi bad payload");
    };

    const tryWorldTimeUtc = async () => {
      const res = await fetchWithTimeout(
        "https://worldtimeapi.org/api/timezone/Etc/UTC"
      );
      if (!res.ok) throw new Error("worldtime utc failed");
      const data = await res.json();
      if (typeof data.unixtime === "number" && isSaneUnix(data.unixtime * 1000)) {
        return data.unixtime * 1000;
      }
      throw new Error("worldtime utc bad payload");
    };

    const errors = [];
    for (const fn of [tryWorldTime, tryTimeApi, tryWorldTimeUtc]) {
      try {
        const ms = await fn();
        if (!isSaneUnix(ms)) throw new Error("rejected insane timestamp");
        return ms;
      } catch (err) {
        errors.push(err);
      }
    }
    throw errors[errors.length - 1] || new Error("time fetch failed");
  }

  async function syncBeirutTime() {
    const unixMs = await fetchBeirutUnixMs();
    timeAnchor = { unixMs, perf: performance.now() };
    return unixMs;
  }

  function updateCountdown() {
    try {
      if (isReleaseDay()) {
        openSite();
        return;
      }
    } catch {
      return;
    }

    const now = trueNowMs();
    if (now == null) return;

    let diff = releaseStartMs() - now;
    if (diff < 0) diff = 0;

    const secs = Math.floor(diff / 1000);
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    set("cd-days", days);
    set("cd-hours", hours);
    set("cd-mins", mins);
    set("cd-secs", s);
  }

  function openSite() {
    if (siteOpened) return;
    // Final hard check — never open early (Android was skipping the wait)
    if (cfg.forceOpen !== true && !isReleaseDay()) return;

    siteOpened = true;
    if (countdownTimer) clearInterval(countdownTimer);
    if (refreshTimer) clearInterval(refreshTimer);
    document.body.classList.remove("is-date-locked");
    waitEl?.classList.add("is-gone");
    setTimeout(() => {
      if (waitEl) waitEl.hidden = true;
    }, 800);
    if (gateEl) {
      gateEl.hidden = false;
      gateEl.classList.remove("is-held");
    }
  }

  async function initDateLock() {
    // Keep gate hidden until we know it's release day
    if (gateEl) {
      gateEl.hidden = true;
      gateEl.classList.add("is-held");
    }

    if (cfg.forceOpen === true) {
      openSite();
      return;
    }

    if (waitEl) {
      waitEl.hidden = false;
      waitEl.classList.remove("is-gone");
    }

    if (waitSub) {
      waitSub.textContent = "Checking the real time in Beirut… stay online.";
    }

    try {
      await syncBeirutTime();

      if (isReleaseDay()) {
        openSite();
        return;
      }

      if (waitSub) {
        waitSub.textContent =
          "Come back on 1 August 2026 (Beirut time). Changing your phone date won’t work.";
      }
      if (waitStatus) waitStatus.hidden = true;
      if (waitCountdown) waitCountdown.hidden = false;

      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1000);
      refreshTimer = setInterval(() => {
        syncBeirutTime()
          .then(() => {
            if (isReleaseDay()) openSite();
          })
          .catch(() => {});
      }, 120000);
    } catch {
      // Stay locked — never open when time can't be verified
      if (waitSub) {
        waitSub.textContent =
          "This surprise needs internet to check Beirut time.";
      }
      if (waitStatus) {
        waitStatus.hidden = false;
        waitStatus.textContent =
          "Connect to Wi‑Fi or mobile data, then refresh the page.";
      }
      if (waitCountdown) waitCountdown.hidden = true;
      if (gateEl) {
        gateEl.hidden = true;
        gateEl.classList.add("is-held");
      }
    }
  }

  initDateLock();

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

  function viewportSize() {
    const vv = window.visualViewport;
    return {
      w: Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth),
      h: Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight),
    };
  }

  function resize() {
    if (!canvas || !ctx) return;
    const { w, h } = viewportSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for iPhone perf
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function maxParticles() {
    const { w } = viewportSize();
    if (w < 430) return 22; // iPhone 12/13/14 Pro Max class
    if (w < 480) return 28;
    if (w < 900) return 45;
    return 64;
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

    const { w, h } = viewportSize();
    particles.push({
      type,
      x: burst ? w * 0.5 + (Math.random() - 0.5) * 120 : Math.random() * w,
      y: burst
        ? h * 0.55 + (Math.random() - 0.5) * 80
        : h + 20 + Math.random() * 60,
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
    const { w, h } = viewportSize();
    ctx.clearRect(0, 0, w, h);

    if (!reducedMotion && Math.random() < (w < 430 ? 0.28 : 0.45)) spawnParticle();

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
    const { h } = viewportSize();
    for (let i = 0; i < maxParticles(); i++) {
      spawnParticle(true);
      particles[i].y = Math.random() * h;
    }
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    tickParticles();
  }

  // iOS-friendly scroll lock (keeps page from scrolling under overlays)
  let lockedScrollY = 0;
  function lockScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("is-scroll-locked");
    document.body.style.top = `-${lockedScrollY}px`;
  }
  function unlockScroll() {
    document.body.classList.remove("is-scroll-locked");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  }

  // ── Gate open → quiz → story ───────────────────────
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
    if (sealOpened || !siteOpened) return;
    sealOpened = true;
    gateEl?.classList.add("is-opening");

    setTimeout(() => {
      gateEl?.classList.add("is-gone");
      showUnlock();
      if (!reducedMotion) burstParticles(18);
    }, reducedMotion ? 0 : 380);
  }

  function showUnlock() {
    if (!unlockEl) return;
    unlockEl.hidden = false;
    lockScroll();
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
    unlockScroll();
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
  const totalSteps = 4;
  const forms = [
    document.getElementById("q1-form"),
    document.getElementById("q2-form"),
    document.getElementById("q3-form"),
    document.getElementById("q4-form"),
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
    if (stepLabel) stepLabel.textContent = `Question ${step + 1} of ${totalSteps}`;

    if (unlockEl) unlockEl.scrollTop = 0;

    if (step === 0) document.getElementById("q1-input")?.focus({ preventScroll: true });
    if (step === 2) document.getElementById("q3-input")?.focus({ preventScroll: true });
    if (step === 3) document.getElementById("choice-yes")?.focus({ preventScroll: true });
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
      if (!reducedMotion) burstParticles(12);
      setStep(3);
    } else {
      showError("q3-error", forms[2]);
      input?.select();
    }
  });

  // ── August 3 yes / runaway no ─────────────────────────
  const dateChoice = document.getElementById("date-choice");
  const choiceYes = document.getElementById("choice-yes");
  const choiceNo = document.getElementById("choice-no");
  const choiceTease = document.getElementById("choice-tease");
  let noDodges = 0;
  let lastDodge = 0;

  const teaseLines = [
    "Nice try…",
    "Nope — that button runs from commitment.",
    "August 3 is calling…",
    "Joe already cleared his schedule.",
    "There’s only one right answer ☺",
  ];

  function dodgeNo(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dateChoice) return;

    const now = performance.now();
    if (now - lastDodge < 300) return;
    lastDodge = now;

    dateChoice.classList.toggle("is-swapped");
    noDodges += 1;

    choiceNo?.classList.remove("is-hop");
    void choiceNo?.offsetWidth;
    choiceNo?.classList.add("is-hop");

    if (choiceTease) {
      choiceTease.textContent = teaseLines[Math.min(noDodges - 1, teaseLines.length - 1)];
    }
  }

  // Hover on desktop + tap/click on mobile (cooldown avoids double-swap)
  choiceNo?.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") dodgeNo(e);
  });
  choiceNo?.addEventListener("click", dodgeNo);

  choiceYes?.addEventListener("click", () => {
    if (choiceTease) choiceTease.textContent = "That’s my girl.";
    if (!reducedMotion) burstParticles(24);
    setTimeout(() => revealStory(), reducedMotion ? 0 : 420);
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

  // Start at January of the answer year (she has to navigate to the real month)
  const answerParts = answers.askDate.split("-").map(Number);
  let viewYear = answerParts[0] || new Date().getFullYear();
  let viewMonth = 0;
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

  // ── Typewriter (only when letter scrolls into view) ─
  const typeEl = document.getElementById("typewriter");
  let typingStarted = false;
  let typeObserver = null;

  if (typeEl) {
    typeEl.textContent = "";
    typeEl.classList.add("is-waiting");
  }

  function startTypewriterWhenReady() {
    if (!typeEl || typingStarted) return;

    // Observe the letter paper itself — must be well on screen
    const target =
      document.querySelector(".letter__paper") ||
      document.getElementById("letter") ||
      typeEl;

    typeObserver?.disconnect();
    typeObserver = new IntersectionObserver(
      (entries) => {
        const hit = entries.some(
          (e) => e.isIntersecting && e.intersectionRatio >= 0.45
        );
        if (!hit) return;
        typeObserver?.disconnect();
        runTypewriter();
      },
      {
        threshold: [0, 0.25, 0.45, 0.6, 0.8],
        rootMargin: "0px 0px -12% 0px",
      }
    );
    typeObserver.observe(target);
  }

  function runTypewriter() {
    if (!typeEl || typingStarted) return;
    typingStarted = true;
    typeEl.classList.remove("is-waiting");
    typeEl.classList.add("is-ready", "is-typing");

    if (reducedMotion) {
      typeEl.textContent = letterText;
      typeEl.classList.remove("is-typing");
      typeEl.classList.add("is-done");
      return;
    }

    typeEl.innerHTML = '<span class="cursor"></span>';
    const cursor = typeEl.querySelector(".cursor");
    let i = 0;

    function step() {
      if (i >= letterText.length) {
        typeEl.classList.remove("is-typing");
        typeEl.classList.add("is-done");
        return;
      }
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

    setTimeout(step, 280);
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
  const secretPassword = normalizeText(ticketCfg.password || "iloveyou");
  const secretBtn = document.getElementById("secret-ticket-btn");
  const ticketModal = document.getElementById("secret-ticket");
  const secretPass = document.getElementById("secret-pass");
  const secretPassForm = document.getElementById("secret-pass-form");
  const secretPassInput = document.getElementById("secret-pass-input");
  const secretPassError = document.getElementById("secret-pass-error");
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

  function openSecretPass() {
    if (!unlocked || !secretPass) return;
    secretPass.hidden = false;
    lockScroll();
    if (secretPassError) secretPassError.hidden = true;
    secretPassForm?.classList.remove("is-wrong");
    if (secretPassInput) secretPassInput.value = "";
    requestAnimationFrame(() => {
      secretPass.classList.add("is-open");
      secretPass.scrollTop = 0;
      secretPassInput?.focus({ preventScroll: true });
    });
  }

  function closeSecretPass(opts = {}) {
    if (!secretPass) return;
    secretPass.classList.remove("is-open");
    if (!opts.keepLocked && (!ticketModal || ticketModal.hidden)) {
      unlockScroll();
    }
    setTimeout(() => {
      secretPass.hidden = true;
    }, 350);
  }

  function openTicket() {
    if (!unlocked || !ticketModal) return;
    closeSecretPass({ keepLocked: true });
    ticketModal.hidden = false;
    lockScroll();
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
    unlockScroll();
    setTimeout(() => {
      ticketModal.hidden = true;
    }, 400);
  }

  secretBtn?.addEventListener("click", openSecretPass);

  secretPassForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = normalizeText(secretPassInput?.value || "");
    if (value === secretPassword) {
      if (secretPassError) secretPassError.hidden = true;
      secretPassForm.classList.remove("is-wrong");
      openTicket();
    } else {
      if (secretPassError) {
        secretPassError.hidden = false;
        secretPassError.classList.remove("is-shake");
        void secretPassError.offsetWidth;
        secretPassError.classList.add("is-shake");
      }
      secretPassForm.classList.remove("is-wrong");
      void secretPassForm.offsetWidth;
      secretPassForm.classList.add("is-wrong");
      secretPassInput?.select();
    }
  });

  document.getElementById("secret-pass-cancel")?.addEventListener("click", closeSecretPass);
  document.getElementById("secret-pass-scrim")?.addEventListener("click", closeSecretPass);
  document.getElementById("ticket-close")?.addEventListener("click", closeTicket);
  document.getElementById("ticket-close-scrim")?.addEventListener("click", closeTicket);

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (ticketModal && !ticketModal.hidden) closeTicket();
    else if (secretPass && !secretPass.hidden) closeSecretPass();
  });
})();
