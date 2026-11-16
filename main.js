
const book = document.querySelector("#book");
const frame = document.querySelector(".book-frame");
const sheets = [...book.querySelectorAll(":scope > .sheet")];
const rail = document.querySelector("#rail");
const menuBtn = document.querySelector("#menu-btn");
const scrim = document.querySelector("#scrim");
const status = document.querySelector("#page-status");
const links = [...rail.querySelectorAll("a")];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneQuery = window.matchMedia("(max-width: 760px)");
const pageCount = sheets.length * 2;

const mobileShadeEl = document.getElementById("mobile-curl-shade");
const mobileFlapEl = document.getElementById("mobile-curl-flap");
const mobilePrintEl = document.getElementById("mobile-curl-print");
const mobileCurlImg = document.getElementById("mobile-curl-img");
const mobileSheenEl = document.getElementById("mobile-curl-sheen");

let cursor = 0;          // Desktop sheet index (0..24)
let mobilePage = 1;      // Mobile single page index (1..48)
let lastModePhone = null;
let busy = false;
let drag = null;
let hoverOn = false;
let animRaf = 0;

function phoneOn() {
  return phoneQuery.matches;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function getFaceImageUrl(face) {
  if (!face) return "";
  const img = face.querySelector("img");
  if (!img) return "";
  const src = img.getAttribute("src");
  if (src) return src;
  const key = img.getAttribute("data-page");
  if (key && window.getCachedPageUrl) {
    const cached = window.getCachedPageUrl(key);
    if (cached) {
      img.src = cached;
      return cached;
    }
  }
  return key || "";
}

// Background Music Controller - "Bài ca Trường ĐTCB (Cover)"
const DEFAULT_BG_VOLUME = 0.35;
let bgAudio = null;
let bgMusicPaused = false;
let bgVolume = DEFAULT_BG_VOLUME;

try {
  if (localStorage.getItem("anpham-music-bg") === "off") {
    bgMusicPaused = true;
  }
} catch {}

function ensureBgMusic() {
  if (!bgAudio) {
    bgAudio = new Audio();
    bgAudio.src = window.INLINE_BG_MUSIC || encodeURI("audio/Background_Bài ca Trường ĐTCB (Cover)1.mp3");
    bgAudio.loop = true;
    bgAudio.volume = bgVolume;
    bgAudio.preload = "auto";

    bgAudio.addEventListener("ended", () => {
      bgAudio.currentTime = 0;
      bgAudio.play().catch(() => {});
    });

    bgAudio.addEventListener("error", () => {
      if (!window.INLINE_BG_MUSIC && !bgAudio.dataset.triedFallback) {
        bgAudio.dataset.triedFallback = "1";
        bgAudio.src = "audio/bg-truong-dtcb.mp3";
        if (!bgMusicPaused) bgAudio.play().catch(() => {});
      }
    });
  }
  return bgAudio;
}

function startBed() {
  if (bgMusicPaused) return;
  const audio = ensureBgMusic();
  if (audio.paused) {
    const p = audio.play();
    if (p) p.then(() => updateMusicUI()).catch(() => updateMusicUI());
  } else {
    updateMusicUI();
  }
}

function pauseBed() {
  bgMusicPaused = true;
  try { localStorage.setItem("anpham-music-bg", "off"); } catch {}
  if (bgAudio) bgAudio.pause();
  updateMusicUI();
}

function resumeBed() {
  bgMusicPaused = false;
  try { localStorage.setItem("anpham-music-bg", "on"); } catch {}
  startBed();
  updateMusicUI();
}

function toggleBed() {
  if (bgMusicPaused || (bgAudio && bgAudio.paused)) {
    resumeBed();
  } else {
    pauseBed();
  }
}

const iconMusicPlay = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const iconMusicMute = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

function updateMusicUI() {
  const btn = document.querySelector("#music-toggle");
  if (!btn) return;
  const isPlaying = bgAudio && !bgAudio.paused && !bgMusicPaused;
  btn.innerHTML = isPlaying ? iconMusicPlay : iconMusicMute;
  btn.setAttribute("aria-pressed", String(isPlaying));
  btn.setAttribute("aria-label", isPlaying ? "Tắt nhạc nền (Bài ca Trường ĐTCB)" : "Bật nhạc nền (Bài ca Trường ĐTCB)");
  btn.setAttribute("title", isPlaying ? "Tắt nhạc nền (Bài ca Trường ĐTCB)" : "Bật nhạc nền (Bài ca Trường ĐTCB)");
  btn.classList.toggle("is-active", Boolean(isPlaying));
}

let flipAudio = null;

function playFlip() {
  if (reduced) return;
  if (!bgMusicPaused) startBed();
  const src = window.INLINE_FLIP_SOUND || "audio/lat_giay.mp3";
  if (!flipAudio) {
    flipAudio = new Audio(src);
    flipAudio.preload = "auto";
    flipAudio.volume = 0.55;
  }
  try {
    flipAudio.currentTime = 0;
    const pending = flipAudio.play();
    if (pending) pending.catch(() => {});
  } catch {}
}

// -------------------------------------------------------------
// SHARED PAPER-CURL GEOMETRY (USED ON BOTH MOBILE & DESKTOP)
// -------------------------------------------------------------
function clipHalf(w, h, nx, ny, midX, midY, keepPositive) {
  const inside = (x, y) => {
    const side = nx * (x - midX) + ny * (y - midY);
    return keepPositive ? side >= -0.6 : side <= 0.6;
  };
  const cross = (a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const denom = nx * dx + ny * dy;
    const t = denom === 0 ? 0 : -(nx * (a[0] - midX) + ny * (a[1] - midY)) / denom;
    const u = clamp(t, 0, 1);
    return [a[0] + dx * u, a[1] + dy * u];
  };
  const corners = [[0, 0], [w, 0], [w, h], [0, h]];
  const out = [];
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const ain = inside(a[0], a[1]);
    const bin = inside(b[0], b[1]);
    if (ain && bin) out.push(b);
    else if (ain && !bin) out.push(cross(a, b));
    else if (!ain && bin) {
      out.push(cross(a, b));
      out.push(b);
    }
  }
  return out;
}

function polygon(points) {
  if (points.length < 3) return "polygon(0px 0px, 0px 0px, 0px 0px)";
  return `polygon(${points.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(",")})`;
}

function scriptedPoint(progress, w, h, corner, liftScale = 0.52) {
  const p = clamp(progress, 0, 1);
  const x = w - p * w * 2.05;
  const bow = Math.sin(Math.PI * p) * Math.pow(1 - p, 0.45);
  const lift = bow * h * liftScale;
  return corner === "top" ? { x, y: lift } : { x, y: h - lift };
}

// -------------------------------------------------------------
// MOBILE SINGLE-PAGE REALISTIC BOOK CURL ENGINE (<= 760px)
// -------------------------------------------------------------
function hideMobileCurlOverlay() {
  if (mobileShadeEl) mobileShadeEl.style.display = "none";
  if (mobileFlapEl) {
    mobileFlapEl.style.display = "none";
    mobileFlapEl.style.clipPath = "";
  }
}

function renderMobileStack() {
  if (window.ensureNearbyPages) window.ensureNearbyPages(mobilePage);
  hideMobileCurlOverlay();

  sheets.forEach((s) => {
    s.style.display = "";
    s.style.zIndex = "1";
    s.classList.remove("is-curling", "is-turned");
  });

  const curFace = document.getElementById("trang-" + mobilePage);

  document.querySelectorAll(".face.doc-face").forEach((f) => {
    f.style.clipPath = "";
    f.style.transform = "";
    f.style.transition = "";
    if (f !== curFace) {
      f.style.display = "none";
      f.style.zIndex = "1";
      f.style.pointerEvents = "none";
      f.setAttribute("aria-hidden", "true");
    }
  });

  if (curFace) {
    const curSheet = curFace.closest(".sheet");
    if (curSheet) curSheet.style.zIndex = "10";
    curFace.style.display = "block";
    curFace.style.visibility = "visible";
    curFace.style.opacity = "1";
    curFace.style.zIndex = "10";
    curFace.style.pointerEvents = "auto";
    curFace.setAttribute("aria-hidden", "false");
  }

  status.textContent = `Trang ${mobilePage} / ${pageCount}`;
  updateTurnButtons();
  highlightActiveMenu([curFace]);
  history.replaceState(null, "", `#trang-${mobilePage}`);
}

function prepareMobileCurlPair(topFace, underFace) {
  if (window.ensureNearbyPages) window.ensureNearbyPages(mobilePage);
  sheets.forEach((s) => {
    s.style.zIndex = "1";
  });
  document.querySelectorAll(".face.doc-face").forEach((f) => {
    if (f !== topFace && f !== underFace) {
      f.style.display = "none";
      f.style.clipPath = "";
    }
  });

  if (underFace) {
    const us = underFace.closest(".sheet");
    if (us) us.style.zIndex = "8";
    underFace.style.display = "block";
    underFace.style.visibility = "visible";
    underFace.style.opacity = "1";
    underFace.style.clipPath = "";
    underFace.style.zIndex = "8";
    underFace.style.pointerEvents = "none";
  }

  if (topFace) {
    const ts = topFace.closest(".sheet");
    if (ts) ts.style.zIndex = "10";
    topFace.style.display = "block";
    topFace.style.visibility = "visible";
    topFace.style.opacity = "1";
    topFace.style.zIndex = "10";
    topFace.style.pointerEvents = "none";
    const src = getFaceImageUrl(topFace);
    if (mobileCurlImg && src && mobileCurlImg.getAttribute("src") !== src) {
      mobileCurlImg.src = src;
    }
  }
}

function curlMobile(topFace, underFace, p, corner = "bottom", customYOffset = 0) {
  const w = book.clientWidth || (topFace ? topFace.offsetWidth : 340);
  const h = book.clientHeight || (topFace ? topFace.offsetHeight : 480);
  if (!topFace || w < 20 || h < 20) return;

  p = clamp(p, 0, 1);
  if (p <= 0.008) {
    topFace.style.clipPath = "";
    hideMobileCurlOverlay();
    return;
  }
  if (p >= 0.992) {
    topFace.style.clipPath = "polygon(0px 0px, 0px 0px, 0px 0px)";
    hideMobileCurlOverlay();
    return;
  }

  const edge = corner === "top" ? "top" : "bottom";
  const origin = edge === "top" ? { x: w, y: 0 } : { x: w, y: h };
  const raw = scriptedPoint(p, w, h, edge, 0.38);
  const target = {
    x: clamp(raw.x, -w * 1.08, w - 2),
    y: clamp(raw.y + customYOffset, -h * 0.06, h * 1.06),
  };

  let vx = target.x - origin.x;
  let vy = target.y - origin.y;
  const length = Math.hypot(vx, vy);
  if (length < 4) {
    topFace.style.clipPath = "";
    hideMobileCurlOverlay();
    return;
  }
  vx /= length;
  vy /= length;

  const midX = (origin.x + target.x) / 2;
  const midY = (origin.y + target.y) / 2;
  const spineSide = clipHalf(w, h, vx, vy, midX, midY, true);
  const flapSide = clipHalf(w, h, vx, vy, midX, midY, false);
  const landed = flapSide.map(([x, y]) => {
    const along = vx * (x - midX) + vy * (y - midY);
    return [x - 2 * along * vx, y - 2 * along * vy];
  });

  topFace.style.clipPath = polygon(spineSide);

  if (mobileFlapEl && mobilePrintEl) {
    mobileFlapEl.style.display = "block";
    mobileFlapEl.style.left = `${-w}px`;
    mobileFlapEl.style.width = `${w * 2}px`;
    mobileFlapEl.style.clipPath = polygon(landed.map(([x, y]) => [x + w, y]));

    const ar = 1 - 2 * vx * vx;
    const br = -2 * vy * vx;
    const cr = -2 * vx * vy;
    const dr = 1 - 2 * vy * vy;
    const er = 2 * vx * (vx * midX + vy * midY);
    const fr = 2 * vy * (vx * midX + vy * midY);

    mobilePrintEl.style.left = `${w}px`;
    mobilePrintEl.style.width = `${w}px`;
    mobilePrintEl.style.height = `${h}px`;
    mobilePrintEl.style.transform = `matrix(${ar.toFixed(4)}, ${br.toFixed(4)}, ${cr.toFixed(4)}, ${dr.toFixed(4)}, ${er.toFixed(2)}, ${fr.toFixed(2)})`;

    if (mobileSheenEl) {
      const flapAngle = (Math.atan2(vy, vx) * 180) / Math.PI;
      mobileSheenEl.style.transform = `translate(${(midX + w).toFixed(1)}px, ${midY.toFixed(1)}px) rotate(${flapAngle.toFixed(2)}deg)`;
    }
  }

  if (mobileShadeEl) {
    const shadeAngle = (Math.atan2(-vy, -vx) * 180) / Math.PI;
    const strength = Math.sin(Math.PI * p);
    mobileShadeEl.style.display = "block";
    mobileShadeEl.style.opacity = clamp(strength * 1.15, 0, 1).toFixed(3);
    mobileShadeEl.style.transform = `translate(${midX.toFixed(1)}px, ${midY.toFixed(1)}px) rotate(${shadeAngle.toFixed(2)}deg)`;
  }
}

function glideMobile(topFace, underFace, fromP, toP, corner, customYOffset, flicked, onDone) {
  busy = true;
  if (animRaf) cancelAnimationFrame(animRaf);
  if (reduced) {
    curlMobile(topFace, underFace, toP, corner, 0);
    busy = false;
    onDone();
    return;
  }
  const dist = Math.abs(toP - fromP);
  const dur = clamp(240 + 420 * dist, 240, 660);
  const start = performance.now();

  function stepFrame(now) {
    const rawT = Math.min(1, (now - start) / dur);
    const eased = flicked ? easeOutCubic(rawT) : easeInOut(rawT);
    const p = fromP + (toP - fromP) * eased;
    const yOff = customYOffset * (1 - eased);
    curlMobile(topFace, underFace, p, corner, yOff);
    if (rawT < 1) {
      animRaf = requestAnimationFrame(stepFrame);
    } else {
      animRaf = 0;
      busy = false;
      onDone();
    }
  }
  animRaf = requestAnimationFrame(stepFrame);
}

function flipMobileNext(corner = "bottom") {
  if (busy || mobilePage >= pageCount) return;
  playFlip();
  const topFace = document.getElementById("trang-" + mobilePage);
  const underFace = document.getElementById("trang-" + (mobilePage + 1));
  prepareMobileCurlPair(topFace, underFace);
  glideMobile(topFace, underFace, 0.015, 1.0, corner, 0, false, () => {
    mobilePage += 1;
    renderMobileStack();
  });
}

function flipMobilePrev(corner = "bottom") {
  if (busy || mobilePage <= 1) return;
  playFlip();
  const topFace = document.getElementById("trang-" + (mobilePage - 1));
  const underFace = document.getElementById("trang-" + mobilePage);
  prepareMobileCurlPair(topFace, underFace);
  curlMobile(topFace, underFace, 0.985, corner, 0);
  glideMobile(topFace, underFace, 0.985, 0.0, corner, 0, false, () => {
    mobilePage -= 1;
    renderMobileStack();
  });
}

function goToMobilePage(target) {
  target = Math.max(1, Math.min(pageCount, Number(target) || 1));
  if (busy) return;
  if (target === mobilePage) {
    renderMobileStack();
    return;
  }
  if (target === mobilePage + 1) {
    flipMobileNext("bottom");
    return;
  }
  if (target === mobilePage - 1) {
    flipMobilePrev("bottom");
    return;
  }
  mobilePage = target;
  renderMobileStack();
}

// -------------------------------------------------------------
// DESKTOP 2-PAGE BOOK CURL ENGINE (>= 761px)
// -------------------------------------------------------------
function pageBox() {
  const box = book.getBoundingClientRect();
  const width = sheets[0].offsetWidth;
  const height = sheets[0].offsetHeight;
  return { left: box.left + box.width / 2, top: box.top, width, height };
}

function restSheet(sheet, turned) {
  sheet.classList.remove("is-curling");
  sheet.style.clipPath = "";
  sheet.style.transformStyle = "preserve-3d";
  sheet.style.transformOrigin = "1px center";
  sheet.style.transform = turned ? "rotateY(-180deg)" : "rotateY(0deg)";
  sheet.style.setProperty("--shade", "0");
  sheet.style.setProperty("--lift", "0");
  sheet.querySelectorAll(".face:not(.curl-print)").forEach((face) => {
    face.style.clipPath = "";
    face.style.transform = "";
    face.style.transformOrigin = "";
    face.style.backfaceVisibility = "";
    face.style.overflow = "";
    face.style.visibility = "";
  });
  sheet.classList.toggle("is-turned", turned);
}

function curlDesktop(sheet, angle, corner = "bottom", point = null) {
  const turned = angle <= -90;
  const p = clamp(Math.abs(angle) / 180, 0, 1);
  const front = sheet.querySelector(".front");
  const back = sheet.querySelector(".back");
  const w = front.offsetWidth;
  const h = front.offsetHeight;
  if (p < 0.012 || p > 0.988) {
    restSheet(sheet, p > 0.5);
    return;
  }
  const edge = corner === "top" ? "top" : "bottom";
  const origin = edge === "top" ? { x: w, y: 0 } : { x: w, y: h };
  const raw = point || scriptedPoint(p, w, h, edge, 0.58);
  const target = {
    x: clamp(raw.x, -w * 1.08, w - 2),
    y: clamp(raw.y, -h * 0.08, h * 1.08),
  };
  let vx = target.x - origin.x;
  let vy = target.y - origin.y;
  const length = Math.hypot(vx, vy);
  if (length < 4) {
    restSheet(sheet, turned);
    return;
  }
  vx /= length;
  vy /= length;
  const midX = (origin.x + target.x) / 2;
  const midY = (origin.y + target.y) / 2;
  const spineSide = clipHalf(w, h, vx, vy, midX, midY, true);
  const flapSide = clipHalf(w, h, vx, vy, midX, midY, false);
  const landed = flapSide.map(([x, y]) => {
    const along = vx * (x - midX) + vy * (y - midY);
    return [x - 2 * along * vx, y - 2 * along * vy];
  });

  sheet.classList.add("is-curling");
  front.style.visibility = "visible";
  sheet.style.clipPath = `inset(-8px 0px -8px ${-w}px)`;
  sheet.style.transform = "none";
  sheet.style.setProperty("--shade", (Math.sin(p * Math.PI) * 0.35).toFixed(3));
  sheet.style.setProperty("--lift", "0.12");
  front.style.overflow = "hidden";
  front.style.transform = "";
  front.style.transformOrigin = "";
  front.style.clipPath = polygon(spineSide);
  back.style.visibility = "hidden";
  back.style.transform = "";
  back.style.clipPath = "";

  const flap = sheet.querySelector(".curl-flap");
  if (flap) {
    flap.style.left = `${-w}px`;
    flap.style.width = `${w * 2}px`;
    flap.style.clipPath = polygon(landed.map(([x, y]) => [x + w, y]));
    const print = flap.querySelector(".curl-print");
    if (print) {
      const ar = 1 - 2 * vx * vx;
      const br = -2 * vy * vx;
      const cr = -2 * vx * vy;
      const dr = 1 - 2 * vy * vy;
      const er = 2 * vx * (vx * midX + vy * midY);
      const fr = 2 * vy * (vx * midX + vy * midY);
      const a = -ar;
      const b = -br;
      const c = cr;
      const d = dr;
      const e = ar * w + er;
      const f = br * w + fr;
      print.style.left = `${w}px`;
      print.style.width = `${w}px`;
      print.style.transform = `matrix(${a.toFixed(4)}, ${b.toFixed(4)}, ${c.toFixed(4)}, ${d.toFixed(4)}, ${e.toFixed(2)}, ${f.toFixed(2)})`;
    }
  }
  const shade = sheet.querySelector(".curl-shade");
  if (shade) {
    const cast = (Math.atan2(-vy, -vx) * 180) / Math.PI;
    shade.style.transform = `translate(${midX.toFixed(1)}px, ${midY.toFixed(1)}px) rotate(${cast.toFixed(2)}deg)`;
  }
}

function stackDesktop() {
  if (phoneOn()) return;
  const right = cursor < sheets.length ? sheets[cursor].querySelector(".front") : null;
  const left = cursor > 0 ? sheets[cursor - 1].querySelector(".back") : null;

  document.body.classList.toggle("side-left", cursor === sheets.length);
  document.body.classList.toggle("side-right", cursor === 0);

  if (window.ensureNearbyPages) window.ensureNearbyPages(cursor * 2 + 1);

  sheets.forEach((sheet, i) => {
    const near = i >= cursor - 2 && i <= cursor + 1;
    if (!near) {
      sheet.style.display = "none";
      sheet.style.pointerEvents = "none";
      return;
    }
    sheet.style.display = "";
    const turned = i < cursor;
    restSheet(sheet, turned);
    sheet.style.zIndex = turned ? String(20 + i) : String(60 - i);
    sheet.style.pointerEvents = i === cursor || i === cursor - 1 ? "auto" : "none";
  });

  sheets.forEach((sheet) => {
    sheet.querySelectorAll(".face:not(.curl-print)").forEach((face) => {
      face.style.display = "";
      face.style.zIndex = "";
      face.style.opacity = "";
      face.style.pointerEvents = "";
      const visible = face === left || face === right;
      face.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  });

  if (cursor === 0) status.textContent = `Trang 1 / ${pageCount}`;
  else if (cursor === sheets.length) status.textContent = `Trang ${pageCount} / ${pageCount}`;
  else status.textContent = `Trang ${cursor * 2}–${cursor * 2 + 1} / ${pageCount}`;

  updateTurnButtons();
  highlightActiveMenu([left, right]);
  const face = right || left;
  if (face) {
    history.replaceState(null, "", `#${face.id}`);
  }
}

function glideDesktop(sheet, fromAngle, toAngle, done, corner = "bottom", fromPoint = null) {
  busy = true;
  hoverOn = false;
  if (animRaf) cancelAnimationFrame(animRaf);
  sheet.style.display = "";
  sheet.style.zIndex = "220";
  if (reduced) {
    curlDesktop(sheet, toAngle, corner);
    busy = false;
    done();
    return;
  }
  const page = pageBox();
  const frac = Math.abs(toAngle - fromAngle) / 180;
  const dur = clamp(280 + 540 * frac, 280, 820);
  const start = performance.now();

  function stepFrame(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = easeInOut(t);
    const angle = fromAngle + (toAngle - fromAngle) * eased;
    let point = null;
    if (fromPoint) {
      const scripted = scriptedPoint(Math.abs(angle) / 180, page.width, page.height, corner || "bottom", 0.58);
      const blend = Math.min(1, t / 0.3);
      point = {
        x: fromPoint.x * (1 - blend) + scripted.x * blend,
        y: fromPoint.y * (1 - blend) + scripted.y * blend,
      };
    }
    curlDesktop(sheet, angle, corner, point);
    if (t < 1) {
      animRaf = requestAnimationFrame(stepFrame);
    } else {
      animRaf = 0;
      busy = false;
      done();
    }
  }
  animRaf = requestAnimationFrame(stepFrame);
}

function goDesktop(to, corner = "bottom") {
  to = clamp(to, 0, sheets.length);
  if (busy || to === cursor) {
    if (!busy && to === cursor) stackDesktop();
    return;
  }
  if (reduced || Math.abs(to - cursor) > 1) {
    cursor = to;
    stackDesktop();
    return;
  }
  const forward = to > cursor;
  const sheet = sheets[forward ? cursor : cursor - 1];
  playFlip();
  glideDesktop(sheet, forward ? 0 : -180, forward ? -180 : 0, () => {
    cursor = to;
    stackDesktop();
  }, corner);
}

// Create desktop .curl-flap & .curl-shade elements cleanly on each sheet
sheets.forEach((sheet) => {
  const flap = document.createElement("div");
  flap.className = "curl-flap";
  flap.setAttribute("aria-hidden", "true");
  const print = sheet.querySelector(".back").cloneNode(true);
  print.classList.add("curl-print");
  print.removeAttribute("id");
  print.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  print.inert = true;
  flap.appendChild(print);
  sheet.appendChild(flap);

  const shade = document.createElement("div");
  shade.className = "curl-shade";
  shade.setAttribute("aria-hidden", "true");
  sheet.appendChild(shade);
});

// -------------------------------------------------------------
// UNIFIED DISPATCHER (MOBILE OR DESKTOP)
// -------------------------------------------------------------
function syncLayout() {
  if (animRaf) {
    cancelAnimationFrame(animRaf);
    animRaf = 0;
  }
  busy = false;
  drag = null;
  hoverOn = false;
  book.classList.remove("is-grabbing");
  hideMobileCurlOverlay();

  const onPhone = phoneOn();
  document.body.classList.toggle("phone", onPhone);

  if (onPhone) {
    if (lastModePhone === false) {
      mobilePage = cursor === sheets.length ? pageCount : clamp(cursor * 2 + 1, 1, pageCount);
    }
    mobilePage = clamp(mobilePage || 1, 1, pageCount);
    lastModePhone = true;
    sheets.forEach((s) => {
      s.classList.remove("is-turned", "is-curling");
      s.style.clipPath = "";
      s.style.transform = "";
      s.style.display = "";
    });
    document.querySelectorAll(".face.doc-face").forEach((f) => {
      f.style.clipPath = "";
      f.style.transform = "";
      f.style.transition = "";
      f.style.overflow = "";
    });
    renderMobileStack();
  } else {
    if (lastModePhone === true) {
      cursor = clamp(Math.floor(mobilePage / 2), 0, sheets.length);
    }
    lastModePhone = false;
    document.querySelectorAll(".face.doc-face").forEach((f) => {
      f.style.display = "";
      f.style.visibility = "";
      f.style.opacity = "";
      f.style.zIndex = "";
      f.style.clipPath = "";
      f.style.transform = "";
      f.style.transition = "";
      f.style.pointerEvents = "";
    });
    stackDesktop();
  }
}

function turnNext() {
  if (phoneOn()) flipMobileNext("bottom");
  else goDesktop(cursor + 1, "bottom");
}

function turnPrev() {
  if (phoneOn()) flipMobilePrev("bottom");
  else goDesktop(cursor - 1, "bottom");
}

function updateTurnButtons() {
  const prevBtn = document.querySelector(".turn-prev");
  const nextBtn = document.querySelector(".turn-next");
  if (!prevBtn || !nextBtn) return;
  if (phoneOn()) {
    prevBtn.disabled = mobilePage <= 1;
    nextBtn.disabled = mobilePage >= pageCount;
  } else {
    prevBtn.disabled = cursor <= 0;
    nextBtn.disabled = cursor >= sheets.length;
  }
}

function highlightActiveMenu(activeFaces) {
  const chapters = new Set((activeFaces || []).filter(Boolean).map((f) => f.dataset.chapter));
  links.forEach((link) => {
    const id = link.dataset.goto || link.getAttribute("href").slice(1);
    const face = document.getElementById(id);
    link.classList.toggle("is-active", Boolean(face && chapters.has(face.dataset.chapter)));
  });
}

function openMenu() {
  rail.classList.add("is-open");
  menuBtn.setAttribute("aria-expanded", "true");
  scrim.hidden = false;
}

function closeMenu() {
  rail.classList.remove("is-open");
  menuBtn.setAttribute("aria-expanded", "false");
  scrim.hidden = true;
}

menuBtn.addEventListener("click", () => {
  rail.classList.contains("is-open") ? closeMenu() : openMenu();
});
scrim.addEventListener("click", closeMenu);

document.querySelector(".turn-prev").addEventListener("click", turnPrev);
document.querySelector(".turn-next").addEventListener("click", turnNext);

// -------------------------------------------------------------
// UNIFIED POINTER INTERACTION (TOUCH DRAG-TO-CURL + MOUSE CURL)
// -------------------------------------------------------------
book.addEventListener("pointerdown", (event) => {
  if (busy || drag) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (event.target.closest("a, button")) return;
  if (!phoneOn()) event.preventDefault();

  const box = book.getBoundingClientRect();
  const py = (event.clientY - box.top) / (box.height || 1);
  const spine = box.left + box.width / 2;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    side: event.clientX < spine ? "left" : "right",
    corner: py < 0.42 ? "top" : "bottom",
    box,
    active: false,
    lastX: event.clientX,
    lastT: performance.now(),
    vx: 0,
    isPhone: phoneOn(),
    direction: null,
    progress: 0,
    topFace: null,
    underFace: null,
    sheet: null,
    shown: 0,
    point: null,
  };
  try { book.setPointerCapture(event.pointerId); } catch {}
});

window.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const now = performance.now();
  const dt = Math.max(8, now - drag.lastT);
  drag.vx = (event.clientX - drag.lastX) / dt;
  drag.lastX = event.clientX;
  drag.lastT = now;

  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;

  if (!drag.active) {
    const minDx = drag.isPhone ? 16 : 6;
    if (Math.abs(dx) < minDx || Math.abs(dx) < Math.abs(dy) * 1.05) return;
    if (drag.isPhone) {
      const next = dx < 0 && mobilePage < pageCount;
      const prev = dx > 0 && mobilePage > 1;
      if (!next && !prev) return;
      drag.active = true;
      drag.direction = next ? "next" : "prev";
      drag.topFace = document.getElementById("trang-" + (next ? mobilePage : mobilePage - 1));
      drag.underFace = document.getElementById("trang-" + (next ? mobilePage + 1 : mobilePage));
      prepareMobileCurlPair(drag.topFace, drag.underFace);
      book.classList.add("is-grabbing");
      playFlip();
    } else {
      const next = dx < 0 && drag.side === "right" && cursor < sheets.length;
      const prev = dx > 0 && drag.side === "left" && cursor > 0;
      if (!next && !prev) return;
      drag.active = true;
      hoverOn = false;
      drag.direction = next ? "next" : "prev";
      drag.sheet = sheets[next ? cursor : cursor - 1];
      drag.sheet.style.display = "";
      drag.sheet.style.zIndex = "220";
      drag.shown = next ? 0 : -180;
      book.classList.add("is-grabbing");
      playFlip();
    }
  }

  if (drag.isPhone) {
    const w = drag.box.width || 340;
    if (drag.direction === "next") {
      drag.progress = clamp((drag.x - event.clientX) / (w * 0.82), 0.015, 0.985);
    } else {
      drag.progress = clamp(1 - (event.clientX - drag.x) / (w * 0.82), 0.015, 0.985);
    }
    const yOffset = clamp(dy * 0.35, -60, 60);
    drag.yOffset = yOffset;
    curlMobile(drag.topFace, drag.underFace, drag.progress, drag.corner, yOffset);
  } else {
    const page = pageBox();
    const local = { x: event.clientX - page.left, y: event.clientY - page.top };
    const progress = clamp((page.width - local.x) / (page.width * 2), 0, 1);
    drag.shown = -progress * 180;
    drag.point = local;
    curlDesktop(drag.sheet, drag.shown, drag.corner, local);
  }
});

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const state = drag;
  drag = null;
  book.classList.remove("is-grabbing");
  try { book.releasePointerCapture(event.pointerId); } catch {}

  if (!state.active) {
    // Quick tap / click without drag
    if (state.isPhone) {
      const relX = event.clientX - state.box.left;
      const w = state.box.width || 340;
      if (relX > w * 0.65 && mobilePage < pageCount) flipMobileNext(state.corner);
      else if (relX < w * 0.35 && mobilePage > 1) flipMobilePrev(state.corner);
    } else if (hoverOn || (event.pointerType && event.pointerType !== "mouse")) {
      const page = pageBox();
      if (cursor < sheets.length && event.clientX > page.left + page.width * 0.82) goDesktop(cursor + 1, state.corner);
      else if (cursor > 0 && event.clientX < state.box.left + page.width * 0.18) goDesktop(cursor - 1, state.corner);
    }
    return;
  }

  if (state.isPhone) {
    const flicked = state.direction === "next" ? state.vx < -0.18 : state.vx > 0.18;
    const commit = state.direction === "next"
      ? (state.progress >= 0.14 || (flicked && state.progress > 0.04))
      : (state.progress <= 0.86 || (flicked && state.progress < 0.96));
    const dest = state.direction === "next" ? (commit ? 1.0 : 0.0) : (commit ? 0.0 : 1.0);
    glideMobile(state.topFace, state.underFace, state.progress, dest, state.corner, state.yOffset || 0, flicked, () => {
      if (commit) {
        mobilePage += state.direction === "next" ? 1 : -1;
      }
      renderMobileStack();
    });
  } else {
    const progress = state.direction === "next"
      ? Math.abs(state.shown) / 180
      : (state.shown + 180) / 180;
    const flicked = state.direction === "next" ? state.vx < -0.45 : state.vx > 0.45;
    const commit = progress >= 0.35 || (flicked && progress > 0.1);
    const dest = state.direction === "next" ? (commit ? -180 : 0) : (commit ? 0 : -180);
    const to = commit ? cursor + (state.direction === "next" ? 1 : -1) : cursor;
    glideDesktop(state.sheet, state.shown, dest, () => {
      cursor = to;
      stackDesktop();
    }, state.corner, state.point);
  }
}

window.addEventListener("pointerup", finishDrag);
window.addEventListener("pointercancel", finishDrag);

// Desktop hover corner dog-ear cue
book.addEventListener("pointermove", (event) => {
  if (drag || busy || reduced || phoneOn()) return;
  if (event.pointerType && event.pointerType !== "mouse") return;
  const page = pageBox();
  const box = book.getBoundingClientRect();
  const y = (event.clientY - box.top) / (box.height || 1);
  const corner = y < 0.45 ? "top" : "bottom";
  const onRight = cursor < sheets.length && event.clientX > page.left + page.width * 0.84 && event.clientX < page.left + page.width + 12;
  const onLeft = cursor > 0 && event.clientX < box.left + page.width * 0.16 && event.clientX > box.left - 12;

  if (!onRight && !onLeft) {
    if (hoverOn) {
      hoverOn = false;
      stackDesktop();
    }
    return;
  }
  hoverOn = true;
  const sheet = sheets[onRight ? cursor : cursor - 1];
  sheet.style.display = "";
  sheet.style.zIndex = "220";
  const progress = onRight ? 0.065 : 0.935;
  curlDesktop(sheet, -progress * 180, corner);
});

book.addEventListener("pointerleave", () => {
  if (drag || busy || !hoverOn) return;
  hoverOn = false;
  stackDesktop();
});

// Rail Menu clicks
rail.addEventListener("click", (event) => {
  const trigger = event.target.closest("a");
  if (!trigger) return;

  const id = trigger.dataset.goto || trigger.getAttribute("href").slice(1);
  const match = id.match(/^trang-(\d+)$/);
  if (!match) return;

  event.preventDefault();
  closeMenu();

  const targetPage = Number(match[1]);
  if (phoneOn()) {
    goToMobilePage(targetPage);
  } else {
    const targetCursor = Math.floor(targetPage / 2);
    goDesktop(targetCursor);
  }
});

// Keyboard navigation
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") turnNext();
  if (event.key === "ArrowLeft") turnPrev();
  if (event.key === "Escape") closeMenu();
});

// Music Toggle Button
const musicBtn = document.querySelector("#music-toggle");
if (musicBtn) {
  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleBed();
  });
}

function onFirstGesture(event) {
  if (event && event.target && event.target.closest("#music-toggle")) return;
  if (!bgMusicPaused) startBed();
}
document.addEventListener("pointerdown", onFirstGesture, { passive: true });
document.addEventListener("touchstart", onFirstGesture, { passive: true });
document.addEventListener("click", onFirstGesture, { passive: true });

// Initial Hash check
const initialHash = location.hash.slice(1);
const initialMatch = initialHash.match(/^trang-(\d+)$/);
if (initialMatch) {
  mobilePage = Math.max(1, Math.min(pageCount, Number(initialMatch[1])));
  cursor = Math.floor(mobilePage / 2);
}

// Initialize layout
syncLayout();
phoneQuery.addEventListener("change", syncLayout);

// Initialize music
ensureBgMusic();
if (!bgMusicPaused) {
  startBed();
}
updateMusicUI();
