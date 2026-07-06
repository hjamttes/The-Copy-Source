(function () {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  var heroPin = document.getElementById("heroPin");
  var tiltEl = document.getElementById("postcardTilt");
  var flipEl = document.getElementById("postcardFlip");
  var hero = document.querySelector(".hero");
  var progressWrap = document.getElementById("pc-instructions");
  var progressFill = document.getElementById("flipFill");
  var progressLabel = document.getElementById("flipLabel");
  var frontFace = flipEl.querySelector(".front");
  var backFace = flipEl.querySelector(".back");

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- scroll-driven flip ----------
     The hero sits inside a tall (240vh) "pin" wrapper and is
     position: sticky. As the user scrolls through that extra height,
     the hero visually stays put while we read scroll progress and use
     it to drive the flip — no wheel/touch hijacking, no scroll-locking
     hacks, just the browser's native scroll position. This is far more
     reliable across browsers/devices than intercepting input events. */

  var rotation = 0;
  var rotationTarget = 0;

  function getScrollRange() {
    var rect = heroPin.getBoundingClientRect();
    var docTop = window.scrollY + rect.top;
    var range = heroPin.offsetHeight - window.innerHeight;
    return { docTop: docTop, range: Math.max(range, 1) };
  }

  function updateTargetFromScroll() {
    var r = getScrollRange();
    var progress = (window.scrollY - r.docTop) / r.range;
    progress = clamp(progress, 0, 1);
    rotationTarget = -180 * progress;
  }

  function applyRotation(deg) {
    var combinedX = deg + tiltCurrentY; // flip (rotateX) + vertical cursor tilt share the same axis
    flipEl.style.transform =
      "rotateY(" + tiltCurrentX.toFixed(2) + "deg) rotateX(" + combinedX.toFixed(2) + "deg)";

    var progress = Math.abs(deg) / 180;
    progressFill.style.width = (progress * 100).toFixed(1) + "%";

    var flippedEnough = progress > 0.5;
    frontFace.setAttribute("aria-hidden", flippedEnough ? "true" : "false");
    backFace.setAttribute("aria-hidden", flippedEnough ? "false" : "true");

    if (progress >= 0.999) {
      progressWrap.classList.add("is-done");
    } else {
      progressWrap.classList.remove("is-done");
      progressLabel.textContent = progress > 0.05
        ? "Keep going \u2014 flipping the postcard"
        : "Scroll or swipe to flip the postcard";
    }
  }

  window.addEventListener("scroll", updateTargetFromScroll, { passive: true });
  window.addEventListener("resize", updateTargetFromScroll, { passive: true });
  updateTargetFromScroll();

  function loop() {
    if (prefersReduced) {
      rotation = rotationTarget;
    } else {
      rotation = lerp(rotation, rotationTarget, 0.18);
      if (Math.abs(rotation - rotationTarget) < 0.05) rotation = rotationTarget;
    }
    applyRotation(rotation);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- tap / click: jump to the other end (accessible fallback) ---------- */

  tiltEl.addEventListener("click", function () {
    var r = getScrollRange();
    var goingForward = rotationTarget > -170;
    var targetY = goingForward ? r.docTop + r.range : r.docTop;
    window.scrollTo({ top: targetY, behavior: prefersReduced ? "auto" : "smooth" });
  });

  /* ---------- keyboard support ---------- */

  tiltEl.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      window.scrollBy({ top: 80, behavior: "smooth" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      window.scrollBy({ top: -80, behavior: "smooth" });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tiltEl.click();
    }
  });

  /* ---------- cursor tilt (desktop only) ---------- */

  var tiltTargetX = 0, tiltTargetY = 0, tiltCurrentX = 0, tiltCurrentY = 0;
  var maxTilt = 7;

  if (!prefersReduced && canHover) {
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width - 0.5;
      var relY = (e.clientY - rect.top) / rect.height - 0.5;
      tiltTargetX = relX * maxTilt * 2;
      tiltTargetY = -relY * maxTilt * 2;
    });
    hero.addEventListener("mouseleave", function () {
      tiltTargetX = 0;
      tiltTargetY = 0;
    });

    (function tiltLoop() {
      tiltCurrentX = lerp(tiltCurrentX, tiltTargetX, 0.08);
      tiltCurrentY = lerp(tiltCurrentY, tiltTargetY, 0.08);
      requestAnimationFrame(tiltLoop);
    })();
  }

  /* ---------- lightweight order form ---------- */

  var form = document.getElementById("orderForm");
  var note = document.getElementById("formNote");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    note.textContent = "Got it \u2014 we'll be in touch shortly to confirm the details.";
    form.reset();
  });
})();
