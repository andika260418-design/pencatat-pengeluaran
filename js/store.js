(function () {
  "use strict";

  var STORAGE_KEY = "catat.state.v1";
  var VERSION = 1;

  var EXPENSE_CATEGORIES = [
    { id: "makan", name: "Makan", color: "#C2560B", icon: "food" },
    { id: "transport", name: "Transport", color: "#215FC2", icon: "bus" },
    { id: "belanja", name: "Belanja", color: "#6D5CCF", icon: "bag" },
    { id: "tagihan", name: "Tagihan", color: "#896D00", icon: "bolt" },
    { id: "hiburan", name: "Hiburan", color: "#C2187E", icon: "play" },
    { id: "kesehatan", name: "Kesehatan", color: "#2F8F4E", icon: "heart" },
    { id: "lainnya", name: "Lainnya", color: "#64736D", icon: "dots" }
  ];

  var INCOME_CATEGORIES = [
    { id: "income-pocket", name: "Pemasukan", color: "#0C6E5F", icon: "wallet" },
    { id: "income-salary", name: "Gaji", color: "#1F7A5C", icon: "banknote" },
    { id: "income-bonus", name: "Bonus", color: "#B7791F", icon: "gift" },
    { id: "income-freelance", name: "Freelance", color: "#215FC2", icon: "briefcase" },
    { id: "income-invest", name: "Investasi", color: "#6D5CCF", icon: "trend" },
    { id: "income-other", name: "Lainnya", color: "#64736D", icon: "dots" }
  ];

  var PAYMENT_METHODS = [
    { id: "Tunai", icon: "wallet" },
    { id: "Transfer", icon: "banknote" },
    { id: "E-wallet", icon: "phone" },
    { id: "Kartu", icon: "card" }
  ];

  var THEMES = ["kuning", "mono", "malam"];

  var DEFAULT_SETTINGS = {
    monthlyBudget: 3500000,
    warningEnabled: true,
    theme: "kuning",
    darkMode: false,
    categoryBudgets: {}
  };

  var state = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function isoDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return (prefix || "tx") + "-" + window.crypto.randomUUID();
    }
    return (prefix || "tx") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeCategory(category, index) {
    if (!category || typeof category !== "object") return null;
    var color = typeof category.color === "string" && /^#[0-9a-fA-F]{6}$/.test(category.color) ? category.color : "#64736D";
    return {
      id: String(category.id || "cat-" + index),
      name: String(category.name || "Kategori").slice(0, 24),
      color: color,
      icon: String(category.icon || "dots")
    };
  }

  function normalizeTransaction(tx, index, categories) {
    if (!tx || typeof tx !== "object") return null;
    var type = tx.type === "income" ? "income" : "expense";
    var amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    var date = String(tx.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    var time = String(tx.time || "12:00");
    if (!/^\d{2}:\d{2}$/.test(time)) time = "12:00";
    var id = String(tx.id || uid());
    var known = categories.some(function (category) {
      return category.id === tx.categoryId;
    });
    var incomeKnown = INCOME_CATEGORIES.some(function (category) {
      return category.id === tx.categoryId;
    });
    if (!known && !incomeKnown) {
      tx.categoryId = type === "income" ? "income-other" : categories[0] ? categories[0].id : "lainnya";
    }
    return {
      id: id,
      type: type,
      amount: Math.round(amount),
      categoryId: String(tx.categoryId),
      date: date,
      time: time,
      payment: String(tx.payment || "Tunai"),
      note: String(tx.note || "").slice(0, 80),
      isSample: tx.isSample === true || /^seed-/.test(id)
    };
  }

  function normalize(raw) {
    var categories = [];
    if (raw && Array.isArray(raw.categories) && raw.categories.length) {
      categories = raw.categories.map(normalizeCategory).filter(Boolean);
    }
    if (!categories.length) categories = clone(EXPENSE_CATEGORIES);

    var storedSettings = raw && raw.settings ? raw.settings : {};
    var settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
    settings.monthlyBudget = Math.max(0, Math.round(Number(settings.monthlyBudget) || 0));
    settings.warningEnabled = settings.warningEnabled !== false;
    if (THEMES.indexOf(storedSettings.theme) >= 0) {
      settings.theme = storedSettings.theme;
    } else {
      settings.theme = settings.darkMode === true ? "malam" : "kuning";
    }
    settings.darkMode = settings.theme === "malam";
    if (!settings.categoryBudgets || typeof settings.categoryBudgets !== "object") {
      settings.categoryBudgets = {};
    }
    var cleanBudgets = {};
    Object.keys(settings.categoryBudgets).forEach(function (id) {
      var value = Math.round(Number(settings.categoryBudgets[id]));
      if (Number.isFinite(value) && value > 0) cleanBudgets[id] = value;
    });
    settings.categoryBudgets = cleanBudgets;

    var txSource = raw && Array.isArray(raw.transactions) ? raw.transactions : [];
    var transactions = txSource
      .map(function (tx, index) {
        return normalizeTransaction(tx, index, categories);
      })
      .filter(Boolean);

    return {
      version: VERSION,
      categories: categories,
      transactions: transactions,
      settings: settings
    };
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("catat:state-changed"));
      return true;
    } catch (error) {
      return false;
    }
  }

  function currentMonthDate(offset, today) {
    var candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, 12, 0, 0);
    if (candidate.getFullYear() !== today.getFullYear() || candidate.getMonth() !== today.getMonth()) {
      return new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
    }
    return candidate;
  }

  function previousMonthDate(day, today) {
    var lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    return new Date(today.getFullYear(), today.getMonth() - 1, Math.min(day, lastDay), 12, 0, 0);
  }

  function createSeedState() {
    var today = new Date();
    var transactions = [];
    var counter = 1;

    function add(type, categoryId, amount, date, time, payment, note) {
      transactions.push({
        id: "seed-" + counter++,
        type: type,
        categoryId: categoryId,
        amount: amount,
        date: isoDate(date),
        time: time,
        payment: payment || "Tunai",
        note: note,
        isSample: true
      });
    }

    function current(offset, type, categoryId, amount, time, payment, note) {
      add(type, categoryId, amount, currentMonthDate(offset, today), time, payment, note);
    }

    function previous(day, type, categoryId, amount, time, payment, note) {
      add(type, categoryId, amount, previousMonthDate(day, today), time, payment, note);
    }

    current(0, "expense", "transport", 30000, "07:45", "Tunai", "Ojek online");
    current(0, "expense", "makan", 18000, "07:20", "Tunai", "Sarapan nasi uduk");

    current(1, "expense", "tagihan", 100000, "19:05", "Transfer", "Token listrik");
    current(1, "expense", "makan", 35000, "18:30", "Tunai", "Makan malam");
    current(1, "expense", "belanja", 62000, "16:40", "Transfer", "Alfamart");

    current(2, "expense", "hiburan", 50000, "19:00", "E-wallet", "Nonton bioskop");
    current(2, "expense", "transport", 40000, "17:20", "Tunai", "Bensin");
    current(2, "income", "income-pocket", 1500000, "09:00", "Transfer", "Uang saku");

    current(3, "expense", "makan", 250000, "10:15", "Transfer", "Belanja makan mingguan");
    current(3, "expense", "transport", 250000, "09:30", "Transfer", "Servis motor");

    current(4, "expense", "makan", 65000, "12:15", "Tunai", "Makan siang kantor");
    current(4, "expense", "belanja", 250000, "18:10", "Transfer", "Belanja bulanan");
    current(4, "expense", "tagihan", 150000, "08:00", "Transfer", "WiFi");

    current(5, "expense", "makan", 25000, "16:20", "E-wallet", "Kopi susu");
    current(5, "expense", "transport", 25000, "08:10", "E-wallet", "Ojek ke kantor");

    current(6, "expense", "makan", 200000, "19:30", "Transfer", "Makan keluarga");
    current(6, "expense", "transport", 50000, "17:00", "Tunai", "Bensin");

    current(7, "expense", "makan", 120000, "10:40", "Transfer", "Buah dan sayur");
    current(7, "expense", "tagihan", 50000, "09:00", "E-wallet", "Pulsa");

    current(8, "expense", "transport", 20000, "07:30", "E-wallet", "Transportasi umum");
    current(8, "expense", "belanja", 75000, "15:50", "Transfer", "Skincare");

    current(9, "expense", "makan", 77000, "19:10", "Tunai", "Makan malam");
    current(9, "expense", "tagihan", 50000, "11:00", "Transfer", "Air minum galon");

    current(10, "expense", "makan", 20000, "07:15", "Tunai", "Sarapan bubur");
    current(10, "expense", "transport", 10000, "12:10", "Tunai", "Parkir");

    current(11, "expense", "makan", 45000, "12:30", "Tunai", "Makan siang");
    current(11, "expense", "kesehatan", 30000, "16:30", "Transfer", "Vitamin");

    current(12, "expense", "makan", 35000, "17:10", "Tunai", "Jajanan sore");
    current(12, "expense", "belanja", 33000, "14:00", "E-wallet", "Alat tulis");

    current(13, "expense", "transport", 90000, "08:20", "Tunai", "Bensin");
    current(13, "expense", "lainnya", 50000, "13:00", "Transfer", "Donasi");

    current(15, "expense", "lainnya", 35000, "09:45", "Transfer", "Biaya admin");

    previous(3, "expense", "tagihan", 1200000, "09:00", "Transfer", "Sewa kos");
    previous(8, "expense", "belanja", 700000, "15:30", "Transfer", "Belanja bulanan");
    previous(12, "expense", "makan", 343000, "20:00", "Tunai", "Makan dan minum");
    previous(18, "expense", "transport", 150000, "08:30", "Tunai", "Transport");
    previous(25, "expense", "tagihan", 150000, "10:15", "Transfer", "Listrik dan air");
    previous(25, "income", "income-salary", 8500000, "08:00", "Transfer", "Gaji bulanan");

    return normalize({
      version: VERSION,
      categories: clone(EXPENSE_CATEGORIES),
      transactions: transactions,
      settings: clone(DEFAULT_SETTINGS)
    });
  }

  function load() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      raw = null;
    }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION && Array.isArray(parsed.transactions)) {
          return normalize(parsed);
        }
      } catch (error) {
        raw = null;
      }
    }
    var seeded = createSeedState();
    state = seeded;
    persist();
    return seeded;
  }

  function init() {
    if (!state) state = load();
    return state;
  }

  function getState() {
    return state;
  }

  function save() {
    if (!state) return false;
    return persist();
  }

  function getCategories(type) {
    if (type === "income") return clone(INCOME_CATEGORIES);
    return state.categories;
  }

  function getCategory(id) {
    var found = state.categories.find(function (category) {
      return category.id === id;
    });
    if (found) return found;
    found = INCOME_CATEGORIES.find(function (category) {
      return category.id === id;
    });
    return found || { id: id, name: "Lainnya", color: "#64736D", icon: "dots" };
  }

  function saveSettings(patch) {
    state.settings = Object.assign({}, state.settings, patch);
    save();
  }

  function saveCategories(categories) {
    state.categories = categories;
    save();
  }

  function replaceState(next) {
    state = normalize(next);
    save();
    return state;
  }

  function clearTransactions() {
    state.transactions = [];
    save();
  }

  function resetToSeed() {
    state = createSeedState();
    save();
    return state;
  }

  function hasCustomCategories() {
    if (state.categories.length !== EXPENSE_CATEGORIES.length) return true;
    return EXPENSE_CATEGORIES.some(function (defaultCategory) {
      var found = state.categories.find(function (category) {
        return category.id === defaultCategory.id;
      });
      return !found ||
        found.name !== defaultCategory.name ||
        found.color !== defaultCategory.color ||
        found.icon !== defaultCategory.icon;
    });
  }

  function hasRealData() {
    if (!state) return false;
    if (state.transactions.some(function (tx) { return !tx.isSample; })) return true;
    if (hasCustomCategories()) return true;
    if (state.settings.monthlyBudget !== DEFAULT_SETTINGS.monthlyBudget) return true;
    if (state.settings.warningEnabled !== DEFAULT_SETTINGS.warningEnabled) return true;
    return Object.keys(state.settings.categoryBudgets).length > 0;
  }

  function sampleCount() {
    if (!state) return 0;
    return state.transactions.filter(function (tx) { return tx.isSample; }).length;
  }

  function withoutSampleData() {
    state = normalize({
      version: VERSION,
      categories: clone(state.categories),
      transactions: state.transactions.filter(function (tx) { return !tx.isSample; }),
      settings: clone(state.settings)
    });
    save();
    return state;
  }

  function resetToEmpty() {
    var theme = state && state.settings ? state.settings.theme : "kuning";
    var settings = clone(DEFAULT_SETTINGS);
    settings.theme = THEMES.indexOf(theme) >= 0 ? theme : "kuning";
    settings.darkMode = settings.theme === "malam";
    state = normalize({
      version: VERSION,
      categories: clone(EXPENSE_CATEGORIES),
      transactions: [],
      settings: settings
    });
    save();
    return state;
  }

  window.Store = {
    init: init,
    getState: getState,
    save: save,
    saveSettings: saveSettings,
    saveCategories: saveCategories,
    replaceState: replaceState,
    clearTransactions: clearTransactions,
    resetToSeed: resetToSeed,
    resetToEmpty: resetToEmpty,
    withoutSampleData: withoutSampleData,
    hasRealData: hasRealData,
    sampleCount: sampleCount,
    getCategories: getCategories,
    getCategory: getCategory,
    uid: uid,
    EXPENSE_CATEGORIES: clone(EXPENSE_CATEGORIES),
    INCOME_CATEGORIES: clone(INCOME_CATEGORIES),
    PAYMENT_METHODS: clone(PAYMENT_METHODS),
    DEFAULT_SETTINGS: clone(DEFAULT_SETTINGS)
  };
})();
