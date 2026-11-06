(function () {
  "use strict";

  var CONFIG = window.CATAT_FIREBASE_CONFIG || {};
  var META_KEY = "catat.cloud.meta.v1";
  var DEVICE_KEY = "catat.cloud.device.v1";
  var REQUIRED_FIELDS = ["apiKey", "authDomain", "projectId", "appId"];

  var auth = null;
  var db = null;
  var currentUser = null;
  var baseRevision = 0;
  var syncedHash = "";
  var syncInFlight = false;
  var scheduleTimer = null;
  var remoteUnsubscribe = null;
  var applyingRemote = false;
  var pendingRemote = null;
  var sessionCounter = 0;
  var initialized = false;
  var initPromise = null;
  var sdkPromise = null;
  var listeners = [];
  var deviceId = readDeviceId();

  var status = {
    configured: isConfigured(),
    ready: false,
    phase: isConfigured() ? "starting" : "unconfigured",
    user: null,
    error: "",
    pending: null,
    dirty: false,
    lastSyncedAt: null,
    online: navigator.onLine
  };

  function hasConfigValue(value) {
    return typeof value === "string" && value.length > 0;
  }

  function isConfigured() {
    return REQUIRED_FIELDS.every(function (field) {
      return hasConfigValue(CONFIG[field]);
    });
  }

  function readDeviceId() {
    try {
      var existing = window.localStorage.getItem(DEVICE_KEY);
      if (existing) return existing;
      var value = "device-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(DEVICE_KEY, value);
      return value;
    } catch (error) {
      return "device-" + Math.random().toString(36).slice(2, 10);
    }
  }

  function hashText(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function hashPayload(payload) {
    return hashText(JSON.stringify(payload));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildPayload(state) {
    var payload = clone(state);
    payload.version = 1;
    payload.transactions = (payload.transactions || []).filter(function (tx) {
      return !tx.isSample;
    }).map(function (tx) {
      delete tx.isSample;
      return tx;
    });
    if (payload.settings) {
      delete payload.settings.darkMode;
    }
    return payload;
  }

  function summarizeState(state) {
    var payload = state && state.transactions ? state : { transactions: [] };
    var transactions = payload.transactions.filter(function (tx) { return !tx.isSample; });
    var income = 0;
    var expense = 0;
    transactions.forEach(function (tx) {
      if (tx.type === "income") income += Number(tx.amount) || 0;
      else expense += Number(tx.amount) || 0;
    });
    return {
      transactions: transactions.length,
      income: income,
      expense: expense
    };
  }

  function userSummary(user) {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email || "",
      emailVerified: user.emailVerified === true
    };
  }

  function notify() {
    status.online = navigator.onLine;
    status.dirty = isDirty();
    listeners.slice().forEach(function (listener) {
      try {
        listener(getStatus());
      } catch (error) {
        return;
      }
    });
  }

  function getStatus() {
    return {
      configured: status.configured,
      ready: status.ready,
      phase: status.phase,
      user: status.user,
      error: status.error,
      pending: status.pending,
      dirty: status.dirty,
      lastSyncedAt: status.lastSyncedAt,
      online: status.online
    };
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    listener(getStatus());
    return function () {
      var index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  function setPhase(phase, error) {
    status.phase = phase;
    status.error = error || "";
    notify();
  }

  function readMeta(uid) {
    try {
      var raw = window.localStorage.getItem(META_KEY);
      if (!raw) return null;
      var meta = JSON.parse(raw);
      if (!meta || meta.uid !== uid) return null;
      return meta;
    } catch (error) {
      return null;
    }
  }

  function saveMeta(uid, revision, hash, lastSyncedAt) {
    try {
      window.localStorage.setItem(META_KEY, JSON.stringify({
        uid: uid,
        revision: revision,
        hash: hash,
        lastSyncedAt: lastSyncedAt || new Date().toISOString()
      }));
    } catch (error) {
      return;
    }
  }

  function clearMeta() {
    try {
      window.localStorage.removeItem(META_KEY);
    } catch (error) {
      return;
    }
  }

  function isDirty() {
    if (!currentUser || !currentUser.emailVerified) return false;
    return hashPayload(buildPayload(Store.getState())) !== syncedHash;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("cloud-sdk-failed")); };
      document.head.appendChild(script);
    });
  }

  function ensureSdk() {
    if (window.firebase && window.firebase.initializeApp) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = loadScript("./js/vendor/firebase-app-compat.js")
      .then(function () { return loadScript("./js/vendor/firebase-auth-compat.js"); })
      .then(function () { return loadScript("./js/vendor/firebase-firestore-compat.js"); });
    return sdkPromise;
  }

  function stateRef() {
    return db.collection("users").doc(currentUser.uid).collection("state").doc("current");
  }

  function timestampToIso(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (typeof value === "string") return value;
    return null;
  }

  function parseCloudDoc(snapshot) {
    if (!snapshot || !snapshot.exists) return null;
    var data = snapshot.data();
    if (!data || !data.state || !Array.isArray(data.state.transactions)) {
      var invalid = new Error("cloud-invalid-data");
      invalid.code = "cloud-invalid-data";
      throw invalid;
    }
    return {
      state: data.state,
      revision: Number(data.revision) || 0,
      updatedAt: timestampToIso(data.updatedAt)
    };
  }

  function attachRemoteListener() {
    if (remoteUnsubscribe) {
      remoteUnsubscribe();
      remoteUnsubscribe = null;
    }
    if (!currentUser || !currentUser.emailVerified) return;
    var listenUid = currentUser.uid;
    var listenSession = sessionCounter;
    var listenRef = stateRef();
    remoteUnsubscribe = listenRef.onSnapshot(function (snapshot) {
      if (!currentUser || currentUser.uid !== listenUid || !currentUser.emailVerified) return;
      if (listenSession !== sessionCounter) return;
      if (snapshot.metadata && snapshot.metadata.hasPendingWrites) return;
      if (!snapshot.exists || syncInFlight) return;
      var remote;
      try {
        remote = parseCloudDoc(snapshot);
      } catch (error) {
        setPhase("error", "Data akun tidak dapat dibaca.");
        return;
      }
      if (!remote || remote.revision <= baseRevision) return;
      if (applyingRemote || status.pending) return;
      if (isDirty()) {
        pendingRemote = remote;
        status.pending = {
          type: "conflict",
          cloud: {
            exists: true,
            revision: remote.revision,
            updatedAt: remote.updatedAt,
            transactions: summarizeState(remote.state).transactions
          },
          local: summarizeState(buildPayload(Store.getState())),
          recommended: ""
        };
        setPhase("conflict");
        return;
      }
      applyRemote(remote);
    }, function () {
      if (!navigator.onLine) setPhase("offline");
      else setPhase("error", "Sinkronisasi akun terputus.");
    });
  }

  function applyRemote(remote, options) {
    var local = Store.getState();
    var next = clone(remote.state);
    if (!next.settings) next.settings = {};
    next.settings.darkMode = local.settings.darkMode === true;
    applyingRemote = true;
    try {
      Store.replaceState(next);
    } finally {
      applyingRemote = false;
    }
    baseRevision = remote.revision;
    syncedHash = hashPayload(buildPayload(Store.getState()));
    saveMeta(currentUser.uid, baseRevision, syncedHash, remote.updatedAt);
    status.pending = null;
    pendingRemote = null;
    status.lastSyncedAt = remote.updatedAt;
    setPhase("synced");
    window.dispatchEvent(new CustomEvent("catat:cloud-applied", {
      detail: { source: options && options.source ? options.source : "cloud" }
    }));
  }

  function showChoice(remote) {
    pendingRemote = remote;
    status.pending = {
      type: "choose-source",
      cloud: remote ? {
        exists: true,
        revision: remote.revision,
        updatedAt: remote.updatedAt,
        transactions: summarizeState(remote.state).transactions
      } : { exists: false },
      local: summarizeState(buildPayload(Store.getState())),
      recommended: remote ? "cloud" : "local"
    };
    setPhase("choice");
  }

  function setConflict(remote) {
    pendingRemote = remote;
    status.pending = {
      type: "conflict",
      cloud: {
        exists: true,
        revision: remote.revision,
        updatedAt: remote.updatedAt,
        transactions: summarizeState(remote.state).transactions
      },
      local: summarizeState(buildPayload(Store.getState())),
      recommended: ""
    };
    setPhase("conflict");
  }

  function scheduleSync(delay) {
    if (scheduleTimer !== null) window.clearTimeout(scheduleTimer);
    scheduleTimer = window.setTimeout(function () {
      scheduleTimer = null;
      syncNow();
    }, delay == null ? 1200 : delay);
  }

  function onStateChanged() {
    if (!currentUser || !currentUser.emailVerified || applyingRemote) return;
    if (status.pending) {
      notify();
      return;
    }
    var currentHash = hashPayload(buildPayload(Store.getState()));
    if (currentHash === syncedHash) {
      if (status.phase !== "synced" && navigator.onLine) setPhase("synced");
      notify();
      return;
    }
    status.dirty = true;
    if (!navigator.onLine) setPhase("offline");
    else if (status.phase !== "syncing") setPhase("pending");
    scheduleSync();
  }

  async function beginSession(user) {
    var session = ++sessionCounter;
    if (remoteUnsubscribe) {
      remoteUnsubscribe();
      remoteUnsubscribe = null;
    }
    status.pending = null;
    pendingRemote = null;
    status.phase = "loading";
    status.error = "";
    status.user = userSummary(user);
    notify();
    if (!navigator.onLine) {
      setPhase("offline");
      return;
    }

    var snapshot;
    try {
      snapshot = await stateRef().get({ source: "server" });
    } catch (error) {
      if (session !== sessionCounter) return;
      if (!navigator.onLine) {
        setPhase("offline");
      } else if (error.code === "permission-denied") {
        setPhase("error", "Email belum terverifikasi atau akses akun ditolak.");
      } else {
        setPhase("error", "Data akun belum dapat dimuat.");
      }
      return;
    }
    if (session !== sessionCounter) return;

    var remote = null;
    try {
      remote = parseCloudDoc(snapshot);
    } catch (error) {
      setPhase("error", "Data akun tidak valid.");
      return;
    }

    var meta = readMeta(user.uid);
    var localHash = hashPayload(buildPayload(Store.getState()));
    var localReal = Store.hasRealData();

    if (remote) {
      status.lastSyncedAt = remote.updatedAt;
      if (meta) {
        baseRevision = Number(meta.revision) || 0;
        syncedHash = typeof meta.hash === "string" ? meta.hash : "";
        var localDirty = localHash !== syncedHash;
        if (remote.revision > baseRevision) {
          if (localDirty) {
            setConflict(remote);
            return;
          }
          applyRemote(remote);
          attachRemoteListener();
          return;
        }
        if (remote.revision < baseRevision) {
          if (localDirty) {
            setConflict(remote);
          } else {
            applyRemote(remote);
            attachRemoteListener();
          }
          return;
        }
        if (localDirty) {
          attachRemoteListener();
          setPhase("syncing");
          await syncNow({ force: false });
          return;
        }
        syncedHash = localHash;
        saveMeta(user.uid, baseRevision, syncedHash, remote.updatedAt);
        attachRemoteListener();
        setPhase("synced");
        return;
      }

      if (localReal) {
        showChoice(remote);
        return;
      }

      applyRemote(remote);
      attachRemoteListener();
      return;
    }

    if (meta) {
      baseRevision = Number(meta.revision) || 0;
      syncedHash = typeof meta.hash === "string" ? meta.hash : "";
    }

    if (localReal) {
      showChoice(null);
      return;
    }

    Store.resetToEmpty();
    baseRevision = 0;
    syncedHash = "";
    attachRemoteListener();
    status.pending = null;
    status.dirty = true;
    await syncNow({ force: true });
  }

  async function syncNow(options) {
    var force = options && options.force === true;
    if (!currentUser || !currentUser.emailVerified) return getStatus();
    if (status.pending) return getStatus();
    if (syncInFlight) return getStatus();
    if (!navigator.onLine) {
      setPhase("offline");
      return getStatus();
    }

    var currentHash = hashPayload(buildPayload(Store.getState()));
    if (!force && currentHash === syncedHash) {
      setPhase("synced");
      return getStatus();
    }

    syncInFlight = true;
    setPhase("syncing");
    var session = sessionCounter;
    var syncRef = stateRef();
    try {
      var result = await db.runTransaction(async function (transaction) {
        var snapshot = await transaction.get(syncRef);
        var remote = parseCloudDoc(snapshot);
        var remoteRevision = remote ? remote.revision : 0;
        if (!force && remoteRevision > baseRevision) {
          var conflict = new Error("revision-conflict");
          conflict.code = "revision-conflict";
          conflict.remote = remote;
          throw conflict;
        }
        var payload = buildPayload(Store.getState());
        var writtenHash = hashPayload(payload);
        var revision = Math.max(remoteRevision, baseRevision) + 1;
        transaction.set(syncRef, {
          schemaVersion: 1,
          state: payload,
          revision: revision,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: deviceId
        });
        return {
          revision: revision,
          writtenHash: writtenHash,
          updatedAt: new Date().toISOString()
        };
      });
      if (session !== sessionCounter) return getStatus();
      baseRevision = result.revision;
      syncedHash = result.writtenHash;
      status.lastSyncedAt = result.updatedAt;
      status.pending = null;
      pendingRemote = null;
      saveMeta(currentUser.uid, baseRevision, syncedHash, result.updatedAt);
      if (hashPayload(buildPayload(Store.getState())) !== result.writtenHash) {
        status.dirty = true;
        setPhase("pending");
        scheduleSync(600);
      } else {
        status.dirty = false;
        setPhase("synced");
      }
      attachRemoteListener();
    } catch (error) {
      if (session !== sessionCounter) return getStatus();
      if (error.code === "revision-conflict" && error.remote) {
        setConflict(error.remote);
      } else if (!navigator.onLine || error.code === "unavailable") {
        setPhase("offline");
      } else if (error.code === "permission-denied") {
        setPhase("error", "Email belum terverifikasi atau akses akun ditolak.");
      } else if (error.code === "cloud-invalid-data") {
        setPhase("error", "Data akun tidak valid.");
      } else {
        setPhase("error", "Data belum tersinkron. Periksa koneksi lalu coba lagi.");
      }
    } finally {
      syncInFlight = false;
      notify();
    }
    return getStatus();
  }

  async function resolveChoice(choice) {
    if (!status.pending) return getStatus();
    if (choice === "cloud") {
      if (!pendingRemote) return getStatus();
      var remote = pendingRemote;
      applyingRemote = true;
      try {
        applyRemote(remote, { source: "account" });
      } finally {
        applyingRemote = false;
      }
      attachRemoteListener();
      return getStatus();
    }

    if (choice === "empty") {
      status.pending = null;
      pendingRemote = null;
      baseRevision = 0;
      syncedHash = "";
      applyingRemote = true;
      try {
        Store.resetToEmpty();
      } finally {
        applyingRemote = false;
      }
      attachRemoteListener();
      status.dirty = true;
      await syncNow({ force: true });
      return getStatus();
    }

    if (choice === "local") {
      var remoteRevision = pendingRemote ? pendingRemote.revision : 0;
      status.pending = null;
      pendingRemote = null;
      baseRevision = remoteRevision;
      Store.withoutSampleData();
      syncedHash = "";
      status.dirty = true;
      attachRemoteListener();
      await syncNow({ force: true });
      return getStatus();
    }

    return getStatus();
  }

  async function init() {
    if (initialized) return initPromise;
    initialized = true;
    status.configured = isConfigured();
    status.online = navigator.onLine;
    if (!status.configured) {
      status.ready = true;
      initPromise = Promise.resolve(getStatus());
      setPhase("unconfigured");
      return initPromise;
    }

    setPhase("starting");
    initPromise = ensureSdk().then(async function () {
      if (!window.firebase.apps.length) window.firebase.initializeApp(CONFIG);
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      try {
        await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
      } catch (error) {
        if (!auth) throw error;
      }
      auth.onAuthStateChanged(async function (user) {
        var session = ++sessionCounter;
        if (remoteUnsubscribe) {
          remoteUnsubscribe();
          remoteUnsubscribe = null;
        }
        currentUser = user || null;
        status.user = userSummary(user);
        status.pending = null;
        pendingRemote = null;
        status.error = "";
        status.dirty = false;
        status.lastSyncedAt = null;
        if (!user) {
          setPhase("signed-out");
          return;
        }
        if (!user.emailVerified) {
          setPhase("unverified");
          return;
        }
        if (session !== sessionCounter) return;
        try {
          await beginSession(user);
        } catch (error) {
          if (session === sessionCounter) setPhase("error", "Data akun belum dapat dimuat.");
        }
      });
      status.ready = true;
      notify();
      return getStatus();
    }).catch(function () {
      status.ready = true;
      setPhase("error", "Komponen akun cloud gagal dimuat.");
      return getStatus();
    });

    window.addEventListener("online", function () {
      if (!currentUser || !currentUser.emailVerified) {
        notify();
        return;
      }
      if (status.pending) {
        notify();
        return;
      }
      beginSession(currentUser);
    });
    window.addEventListener("offline", function () {
      if (currentUser) setPhase("offline");
      else notify();
    });
    window.addEventListener("catat:state-changed", onStateChanged);

    return initPromise;
  }

  async function ensureReady() {
    if (!isConfigured()) {
      var unconfigured = new Error("cloud-unconfigured");
      unconfigured.code = "cloud-unconfigured";
      throw unconfigured;
    }
    await init();
    if (!auth) {
      var unavailable = new Error("cloud-unavailable");
      unavailable.code = "cloud-unavailable";
      throw unavailable;
    }
  }

  async function signIn(email, password) {
    await ensureReady();
    return auth.signInWithEmailAndPassword(String(email || "").trim(), String(password || ""));
  }

  async function signUp(email, password) {
    await ensureReady();
    var credential = await auth.createUserWithEmailAndPassword(String(email || "").trim(), String(password || ""));
    if (credential.user) await credential.user.sendEmailVerification();
    return credential;
  }

  async function sendReset(email) {
    await ensureReady();
    return auth.sendPasswordResetEmail(String(email || "").trim());
  }

  async function resendVerification() {
    await ensureReady();
    if (!auth.currentUser) throw new Error("auth-no-user");
    return auth.currentUser.sendEmailVerification();
  }

  async function refreshVerification() {
    await ensureReady();
    if (!auth.currentUser) throw new Error("auth-no-user");
    await auth.currentUser.reload();
    if (!auth.currentUser.emailVerified) {
      setPhase("unverified");
      return false;
    }
    if (typeof auth.currentUser.getIdToken === "function") {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (error) {
        if (!navigator.onLine) {
          setPhase("offline");
          return true;
        }
      }
    }
    await beginSession(auth.currentUser);
    return true;
  }

  async function signOut() {
    await ensureReady();
    if (!auth.currentUser) {
      setPhase("signed-out");
      return true;
    }
    if (status.pending) {
      var pendingError = new Error("cloud-pending");
      pendingError.code = "cloud-pending";
      throw pendingError;
    }
    if (isDirty()) {
      await syncNow();
      if (status.pending) {
        var conflictError = new Error("cloud-pending");
        conflictError.code = "cloud-pending";
        throw conflictError;
      }
      if (isDirty() || !navigator.onLine) {
        var unsynced = new Error("cloud-unsynced");
        unsynced.code = "cloud-unsynced";
        throw unsynced;
      }
    }
    var uid = currentUser.uid;
    await auth.signOut();
    sessionCounter += 1;
    if (remoteUnsubscribe) {
      remoteUnsubscribe();
      remoteUnsubscribe = null;
    }
    currentUser = null;
    status.user = null;
    status.pending = null;
    pendingRemote = null;
    status.dirty = false;
    status.lastSyncedAt = null;
    baseRevision = 0;
    syncedHash = "";
    if (readMeta(uid)) clearMeta();
    setPhase("signed-out");
    return true;
  }

  async function discardSession() {
    sessionCounter += 1;
    if (remoteUnsubscribe) {
      remoteUnsubscribe();
      remoteUnsubscribe = null;
    }
    currentUser = null;
    status.user = null;
    status.pending = null;
    pendingRemote = null;
    status.dirty = false;
    status.lastSyncedAt = null;
    baseRevision = 0;
    syncedHash = "";
    clearMeta();
    setPhase("signed-out");
    if (auth) {
      try {
        await auth.signOut();
      } catch (error) {
        if (!auth.currentUser) return true;
      }
    }
    return true;
  }

  window.CatatCloud = {
    init: init,
    isConfigured: isConfigured,
    getStatus: getStatus,
    subscribe: subscribe,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    sendReset: sendReset,
    resendVerification: resendVerification,
    refreshVerification: refreshVerification,
    syncNow: syncNow,
    resolveChoice: resolveChoice,
    discardSession: discardSession
  };
})();
