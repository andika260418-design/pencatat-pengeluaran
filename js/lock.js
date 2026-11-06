(function () {
  "use strict";

  var STORAGE_KEY = "catat.lock.v1";
  var ATTEMPT_KEY = "catat.lockAttempts.v1";
  var DEFAULT_AUTO_LOCK = 300000;
  var ALLOWED_AUTO_LOCK = [0, 60000, 300000, 900000];
  var PIN_LENGTH = 6;
  var PBKDF2_ITERATIONS = 150000;

  var elements = null;
  var pinBuffer = "";
  var verifying = false;
  var visible = false;
  var initialized = false;
  var onUnlocked = null;
  var onForgot = null;
  var inactivityTimer = null;
  var hiddenAt = null;
  var interactionBound = false;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function bytesToBase64(bytes) {
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  function base64ToBytes(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function readConfig() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.enabled !== true || !parsed.salt || !parsed.hash) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeConfig(config) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function hasCrypto() {
    return window.crypto && window.crypto.subtle && window.crypto.getRandomValues;
  }

  async function hashPin(pin, salt, iterations) {
    var material = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    var bits = await window.crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    }, material, 256);
    return bytesToBase64(new Uint8Array(bits));
  }

  function sameHash(left, right) {
    if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
    var difference = 0;
    for (var i = 0; i < left.length; i += 1) {
      difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return difference === 0;
  }

  function readAttempts() {
    try {
      var raw = window.localStorage.getItem(ATTEMPT_KEY);
      if (!raw) return { count: 0, until: 0 };
      var parsed = JSON.parse(raw);
      return {
        count: Number(parsed && parsed.count) || 0,
        until: Number(parsed && parsed.until) || 0
      };
    } catch (error) {
      return { count: 0, until: 0 };
    }
  }

  function writeAttempts(count, until) {
    window.localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ count: count, until: until }));
  }

  function clearAttempts() {
    try {
      window.localStorage.removeItem(ATTEMPT_KEY);
    } catch (error) {
      return;
    }
  }

  function isEnabled() {
    return !!readConfig();
  }

  function getAutoLock() {
    var config = readConfig();
    return config && ALLOWED_AUTO_LOCK.indexOf(config.autoLockMs) >= 0 ? config.autoLockMs : DEFAULT_AUTO_LOCK;
  }

  function collectElements() {
    elements = {
      screen: document.getElementById("lockScreen"),
      subtitle: document.getElementById("lockSubtitle"),
      dots: document.getElementById("lockDots"),
      error: document.getElementById("lockError"),
      keypad: document.getElementById("lockKeypad"),
      forgot: document.getElementById("lockForgot")
    };
  }

  function renderDots() {
    if (!elements || !elements.dots) return;
    var html = "";
    for (var i = 0; i < PIN_LENGTH; i += 1) {
      html += '<span class="lock-dot' + (i < pinBuffer.length ? " is-filled" : "") + '"></span>';
    }
    elements.dots.innerHTML = html;
  }

  function setError(message) {
    if (elements && elements.error) elements.error.textContent = message || "";
  }

  function setShaking(active) {
    if (!elements || !elements.screen) return;
    elements.screen.classList.toggle("is-shaking", active);
    if (active) {
      window.setTimeout(function () {
        if (elements && elements.screen) elements.screen.classList.remove("is-shaking");
      }, 420);
    }
  }

  function clearTimer() {
    if (inactivityTimer !== null) {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  function armInactivityTimer() {
    clearTimer();
    if (visible || !isEnabled()) return;
    var delay = getAutoLock();
    if (delay <= 0) return;
    inactivityTimer = window.setTimeout(function () {
      lock();
    }, delay);
  }

  function noteInteraction() {
    if (visible || !isEnabled()) return;
    armInactivityTimer();
  }

  function bindInteractions() {
    if (interactionBound) return;
    interactionBound = true;
    ["pointerdown", "keydown", "touchstart"].forEach(function (name) {
      document.addEventListener(name, noteInteraction, { passive: true });
    });
    document.addEventListener("visibilitychange", function () {
      if (!isEnabled()) return;
      if (document.hidden) {
        hiddenAt = Date.now();
        if (!visible && getAutoLock() === 0) lock();
      } else if (hiddenAt !== null) {
        var elapsed = Date.now() - hiddenAt;
        hiddenAt = null;
        if (!visible && elapsed >= getAutoLock()) lock();
        else armInactivityTimer();
      }
    });
  }

  function show(options) {
    if (options) {
      if (typeof options.onUnlocked === "function") onUnlocked = options.onUnlocked;
      if (typeof options.onForgot === "function") onForgot = options.onForgot;
    }
    if (!isEnabled()) {
      hide();
      if (onUnlocked) onUnlocked();
      return;
    }
    visible = true;
    pinBuffer = "";
    verifying = false;
    setError("");
    renderDots();
    document.documentElement.classList.add("is-app-locked");
    if (elements && elements.screen) {
      elements.screen.classList.add("is-visible");
      elements.screen.setAttribute("aria-hidden", "false");
    }
    clearTimer();
    window.dispatchEvent(new CustomEvent("catat:locked"));
  }

  function hide() {
    visible = false;
    pinBuffer = "";
    verifying = false;
    setError("");
    clearTimer();
    document.documentElement.classList.remove("is-app-locked");
    if (elements && elements.screen) {
      elements.screen.classList.remove("is-visible");
      elements.screen.setAttribute("aria-hidden", "true");
    }
  }

  function lock() {
    if (!isEnabled()) return;
    show();
  }

  async function verifyPin(pin) {
    var config = readConfig();
    if (!config) return true;
    if (!hasCrypto()) throw new Error("lock-crypto-unavailable");
    var salt = base64ToBytes(config.salt);
    var hash = await hashPin(pin, salt, Number(config.iterations) || PBKDF2_ITERATIONS);
    return sameHash(hash, config.hash);
  }

  async function unlock() {
    if (!isEnabled()) {
      hide();
      if (onUnlocked) onUnlocked();
      return;
    }
    var attempts = readAttempts();
    if (attempts.until && Date.now() < attempts.until) {
      var seconds = Math.ceil((attempts.until - Date.now()) / 1000);
      setError("Coba lagi dalam " + seconds + " detik.");
      pinBuffer = "";
      renderDots();
      return;
    }
    verifying = true;
    try {
      var matches = await verifyPin(pinBuffer);
      if (matches) {
        clearAttempts();
        hide();
        armInactivityTimer();
        if (onUnlocked) onUnlocked();
        window.dispatchEvent(new CustomEvent("catat:unlocked"));
        return;
      }
      var nextCount = attempts.count + 1;
      if (nextCount >= 5) {
        writeAttempts(0, Date.now() + 30000);
        setError("Terlalu banyak percobaan. Tunggu 30 detik.");
      } else {
        writeAttempts(nextCount, 0);
        setError("PIN salah. Sisa " + (5 - nextCount) + " percobaan.");
      }
      setShaking(true);
      pinBuffer = "";
      renderDots();
    } catch (error) {
      setError("Kunci tidak dapat dibuka di browser ini.");
      pinBuffer = "";
      renderDots();
    } finally {
      verifying = false;
    }
  }

  function pushDigit(digit) {
    if (!visible || verifying) return;
    if (/^\d$/.test(digit) && pinBuffer.length < PIN_LENGTH) {
      pinBuffer += digit;
      setError("");
      renderDots();
      if (pinBuffer.length === PIN_LENGTH) {
        window.setTimeout(unlock, 120);
      }
    } else if (digit === "back") {
      pinBuffer = pinBuffer.slice(0, -1);
      setError("");
      renderDots();
    }
  }

  async function setPin(pin) {
    if (!/^\d{6}$/.test(pin)) throw new Error("pin-invalid");
    if (!hasCrypto()) throw new Error("lock-crypto-unavailable");
    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var hash = await hashPin(pin, salt, PBKDF2_ITERATIONS);
    var current = readConfig();
    writeConfig({
      enabled: true,
      salt: bytesToBase64(salt),
      hash: hash,
      iterations: PBKDF2_ITERATIONS,
      autoLockMs: current && ALLOWED_AUTO_LOCK.indexOf(current.autoLockMs) >= 0 ? current.autoLockMs : DEFAULT_AUTO_LOCK,
      updatedAt: new Date().toISOString()
    });
    clearAttempts();
    armInactivityTimer();
    return true;
  }

  async function changePin(currentPin, nextPin) {
    var matches = await verifyPin(currentPin);
    if (!matches) throw new Error("pin-wrong");
    return setPin(nextPin);
  }

  async function disable(pin) {
    var matches = await verifyPin(pin);
    if (!matches) throw new Error("pin-wrong");
    removePin();
  }

  function removePin() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ATTEMPT_KEY);
    } catch (error) {
      return;
    }
    hide();
  }

  function setAutoLock(value) {
    var config = readConfig();
    var delay = Number(value);
    if (!config || ALLOWED_AUTO_LOCK.indexOf(delay) < 0) return false;
    config.autoLockMs = delay;
    config.updatedAt = new Date().toISOString();
    writeConfig(config);
    armInactivityTimer();
    return true;
  }

  function setSubtitle(text) {
    if (elements && elements.subtitle) elements.subtitle.textContent = text || "Buka Catat untuk melanjutkan";
  }

  function autoLockLabel(value) {
    if (value === 0) return "Langsung";
    if (value === 60000) return "1 menit";
    if (value === 900000) return "15 menit";
    return "5 menit";
  }

  function init(options) {
    if (initialized) {
      if (options) show(options);
      return;
    }
    initialized = true;
    collectElements();
    if (options) {
      if (typeof options.onUnlocked === "function") onUnlocked = options.onUnlocked;
      if (typeof options.onForgot === "function") onForgot = options.onForgot;
    }
    if (elements && elements.keypad) {
      elements.keypad.addEventListener("click", function (event) {
        var button = event.target.closest("[data-lock-key]");
        if (button) pushDigit(button.getAttribute("data-lock-key"));
      });
    }
    if (elements && elements.forgot) {
      elements.forgot.addEventListener("click", function () {
        if (onForgot) onForgot();
      });
    }
    document.addEventListener("keydown", function (event) {
      if (!visible) return;
      var target = event.target;
      if (target && target.closest && target.closest("input, textarea, select, .sheet-wrap, .dialog-wrap")) return;
      if (document.querySelector(".sheet-wrap.is-open, .dialog-wrap.is-open")) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pushDigit(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        pushDigit("back");
      }
    });
    bindInteractions();
    renderDots();
  }

  window.CatatLock = {
    init: init,
    show: show,
    hide: hide,
    lock: lock,
    isEnabled: isEnabled,
    isLocked: function () { return visible; },
    shouldLockOnBoot: isEnabled,
    verifyPin: verifyPin,
    setPin: setPin,
    changePin: changePin,
    disable: disable,
    removePin: removePin,
    getAutoLock: getAutoLock,
    setAutoLock: setAutoLock,
    autoLockLabel: autoLockLabel,
    setSubtitle: setSubtitle
  };
})();
