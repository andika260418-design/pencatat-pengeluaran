(function () {
  "use strict";

  var MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  var SCREENS = ["beranda", "riwayat", "laporan", "pengaturan"];
  var REST_COLOR = "#64736D";

  function byId(id) {
    return document.getElementById(id);
  }

  var els = {
    screens: document.querySelectorAll(".screen"),
    navItems: document.querySelectorAll(".nav-item"),
    monthTrigger: byId("monthTrigger"),
    monthLabel: byId("monthLabel"),
    berandaBody: byId("berandaBody"),
    searchInput: byId("searchInput"),
    riwayatBody: byId("riwayatBody"),
    reportButtons: document.querySelectorAll("#reportTabs .seg-btn"),
    laporanBody: byId("laporanBody"),
    pengaturanBody: byId("pengaturanBody"),
    fabAdd: byId("fabAdd"),
    addScreen: byId("addScreen"),
    addBack: byId("addBack"),
    addTitle: byId("addTitle"),
    typeToggle: byId("typeToggle"),
    amountDisplay: byId("amountDisplay"),
    amountValue: byId("amountValue"),
    categoryGrid: byId("categoryGrid"),
    dateBtn: byId("dateBtn"),
    dateBtnLabel: byId("dateBtnLabel"),
    paymentBtn: byId("paymentBtn"),
    paymentBtnLabel: byId("paymentBtnLabel"),
    noteInput: byId("noteInput"),
    keypad: byId("keypad"),
    saveTx: byId("saveTx"),
    sheetWrap: byId("sheetWrap"),
    sheetTitle: byId("sheetTitle"),
    sheetBody: byId("sheetBody"),
    dialogWrap: byId("dialogWrap"),
    dialogTitle: byId("dialogTitle"),
    dialogMessage: byId("dialogMessage"),
    dialogCancel: byId("dialogCancel"),
    dialogConfirm: byId("dialogConfirm"),
    dialogBackdrop: document.querySelector(".dialog-backdrop"),
    toast: byId("toast"),
    toastText: byId("toastText"),
    restoreInput: byId("restoreInput"),
    themeColorMeta: byId("themeColorMeta")
  };

  var state = Store.init();
  var ui = {
    screen: "beranda",
    selectedMonth: monthKey(new Date()),
    period: "month",
    search: "",
    addOpen: false,
    editId: null,
    addType: "expense",
    amount: 0,
    categoryId: "makan",
    date: isoDate(new Date()),
    time: "",
    payment: "Tunai",
    note: "",
    detailId: null,
    categoryEditId: null,
    categoryDraft: null
  };
  var toastTimer = null;
  var dialogAction = null;

  var ICONS = {
    food: '<path d="M5 9.5h10.5v4.1a4.4 4.4 0 0 1-4.4 4.4H9.4A4.4 4.4 0 0 1 5 13.6V9.5Z"/><path d="M15.5 10.5h1.4a2.5 2.5 0 0 1 0 5h-1.4"/><path d="M7.6 6.2c.5-.8.5-1.5 0-2.2M10.8 6.2c.5-.8.5-1.5 0-2.2M14 6.2c.5-.8.5-1.5 0-2.2"/>',
    coffee: '<path d="M6 9h9v4a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9Z"/><path d="M15 10h1.2a2.3 2.3 0 0 1 0 4.6H15M5 20h11M8 4.5c.5.8.5 1.5 0 2.3M11 4.5c.5.8.5 1.5 0 2.3"/>',
    bus: '<rect x="4" y="4" width="16" height="13.5" rx="3"/><path d="M4 10.5h16M7.5 17.5V20M16.5 17.5V20"/><circle cx="7.6" cy="13.8" r="1" class="fill"/><circle cx="16.4" cy="13.8" r="1" class="fill"/>',
    car: '<path d="M5 16.5v2M19 16.5v2M3.5 16.5h17v-4l-2.1-4.3A2 2 0 0 0 16.6 7H7.4a2 2 0 0 0-1.8 1.2L3.5 12.5v4Z"/><path d="M5.5 12.5h13"/><circle cx="7.5" cy="14.5" r=".8" class="fill"/><circle cx="16.5" cy="14.5" r=".8" class="fill"/>',
    bag: '<path d="M5.5 8.5h13l1.1 11.2a1.5 1.5 0 0 1-1.5 1.6H5.9a1.5 1.5 0 0 1-1.5-1.6L5.5 8.5Z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9"/>',
    bolt: '<path d="M13.2 3 5.8 13.2h5.1L10.8 21l7.4-10.2h-5.1L13.2 3Z"/>',
    play: '<path class="fill" d="M9 6.4v11.2L18.3 12 9 6.4Z"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.7C19.5 15.6 12 20 12 20Z"/>',
    dots: '<circle class="fill" cx="7" cy="12" r="1.4"/><circle class="fill" cx="12" cy="12" r="1.4"/><circle class="fill" cx="17" cy="12" r="1.4"/>',
    wallet: '<path d="M4 8a2.5 2.5 0 0 1 2.5-2.5H18A1.5 1.5 0 0 1 19.5 7v11A1.5 1.5 0 0 1 18 19.5H6.5A2.5 2.5 0 0 1 4 17V8Z"/><path d="M4 9h13.5"/><path d="M16 13.5h3.5v3H16a1.5 1.5 0 0 1 0-3Z"/>',
    banknote: '<rect x="3.5" y="6.5" width="17" height="11" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3.5 9h17v4h-17V9ZM12 9v11"/><path d="M12 8.8C10.4 6.4 8.8 5.5 7.5 6.2 6.2 7 6.8 8.8 8.9 8.8H12Zm0 0c1.6-2.4 3.2-3.3 4.5-2.6 1.3.8.7 2.6-1.4 2.6H12Z"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5c2.8 1.2 5.6 1.8 8.5 1.8s5.7-.6 8.5-1.8M10.5 14.5h3"/>',
    trend: '<path d="m4 16 5-5 3.5 3.5L20 7"/><path d="M15.5 7H20v4.5"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M10.5 6h3M11 18.5h2"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18M7 14.5h3"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5H14V16h-4v5.5H5.5A1.5 1.5 0 0 1 4 20v-9.5Z"/>',
    book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22.5V4.5Z"/><path d="M5 4.5A2.5 2.5 0 0 0 7.5 7H20M9 11h7M9 14.5h5"/>',
    plane: '<path d="m10.5 13.5-6-2.5V9l6 1 3-6h2l-1.5 6.5 5.5 2.5h-4l-2 4.5h-1.5l.5-4.5-2 1v2.5h-1.5l-.5-3.5Z"/>',
    pet: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 15.5c1.2-2 2.5-3 4-3s2.8 1 4 3c1.1 1.8-.4 4-2.5 3.2-1-.4-2-.4-3 0-2.1.8-3.6-1.4-2.5-3.2Z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    arrowDown: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
    arrowUp: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    warning: '<path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 9.5v4.5M12 17.2h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14 7 3 3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v5.5M14 11v5.5"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/>',
    bell: '<path d="M18 9.5a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6ZM10 19h4"/>'
  };

  var ICON_NAMES = ["food", "coffee", "bus", "car", "bag", "bolt", "play", "heart", "dots", "wallet", "banknote", "gift", "briefcase", "trend", "phone", "card", "home", "book", "plane", "pet"];
  var COLOR_OPTIONS = ["#C2560B", "#215FC2", "#6D5CCF", "#896D00", "#C2187E", "#2F8F4E", "#64736D", "#0C6E5F", "#B7791F", "#C2413B", "#0F766E", "#475569"];

  function iconSvg(name, className) {
    var body = ICONS[name] || ICONS.dots;
    return '<svg' + (className ? ' class="' + className + '"' : "") + ' viewBox="0 0 24 24" aria-hidden="true">' + body + "</svg>";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function isoDate(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseISO(value) {
    var parts = String(value).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1);
  }

  function currentMonthKey() {
    return monthKey(new Date());
  }

  function previousMonthKey(key) {
    var parts = key.split("-");
    return monthKey(new Date(Number(parts[0]), Number(parts[1]) - 2, 1, 12, 0, 0));
  }

  function startOfMonth(key) {
    var parts = key.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1, 12, 0, 0);
  }

  function endOfMonth(key) {
    var parts = key.split("-");
    return new Date(Number(parts[0]), Number(parts[1]), 0, 12, 0, 0);
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0);
  }

  function monthName(key) {
    var parts = key.split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + parts[0];
  }

  function shortMonthName(key) {
    var parts = key.split("-");
    return MONTHS_SHORT[Number(parts[1]) - 1] + " " + parts[0];
  }

  function friendlyMonth(key) {
    return key === currentMonthKey() ? "Bulan ini" : monthName(key);
  }

  function fullDate(value) {
    var date = parseISO(value);
    return date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
  }

  function formatDateShort(value) {
    var date = parseISO(value);
    var year = date.getFullYear() !== new Date().getFullYear() ? " " + date.getFullYear() : "";
    return date.getDate() + " " + MONTHS_SHORT[date.getMonth()] + year;
  }

  function relativeDay(value) {
    var today = parseISO(isoDate(new Date()));
    var date = parseISO(value);
    var diff = Math.round((today - date) / 86400000);
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Kemarin";
    if (diff > 1 && diff < 7) return diff + " hari lalu";
    return formatDateShort(value);
  }

  function friendlyDate(value) {
    var today = isoDate(new Date());
    if (value === today) return "Hari ini";
    if (value === isoDate(addDays(new Date(), -1))) return "Kemarin";
    return formatDateShort(value);
  }

  function nowTime() {
    var date = new Date();
    return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  function formatNumber(value) {
    var number = Math.round(Math.abs(Number(value) || 0));
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatRp(value) {
    return "Rp " + formatNumber(value);
  }

  function transactionAmount(tx) {
    return (tx.type === "income" ? "+" : "\u2212") + formatRp(tx.amount);
  }

  function compactNumber(value) {
    var number = Math.abs(Math.round(Number(value) || 0));
    if (number >= 1000000000) return trimDecimal(number / 1000000000) + " M";
    if (number >= 1000000) return trimDecimal(number / 1000000) + " jt";
    if (number >= 1000) return trimDecimal(number / 1000) + " rb";
    return String(number);
  }

  function trimDecimal(value) {
    return String(Number(value.toFixed(2))).replace(".", ",");
  }

  function categoryById(id) {
    return Store.getCategory(id);
  }

  function categoriesFor(type) {
    return Store.getCategories(type);
  }

  function transactionTitle(tx) {
    return tx.note ? tx.note : categoryById(tx.categoryId).name;
  }

  function monthTransactions(key) {
    return state.transactions.filter(function (tx) {
      return tx.date.slice(0, 7) === key;
    });
  }

  function sumAmount(transactions, type) {
    return transactions.reduce(function (total, tx) {
      if (type && tx.type !== type) return total;
      return total + tx.amount;
    }, 0);
  }

  function categoryBreakdown(transactions, maxItems) {
    var map = {};
    var total = 0;
    transactions.forEach(function (tx) {
      if (tx.type !== "expense") return;
      var category = categoryById(tx.categoryId);
      if (!map[tx.categoryId]) {
        map[tx.categoryId] = { id: tx.categoryId, name: category.name, color: category.color, amount: 0 };
      }
      map[tx.categoryId].amount += tx.amount;
      total += tx.amount;
    });
    var items = Object.keys(map).map(function (id) {
      return map[id];
    }).sort(function (a, b) {
      return b.amount - a.amount;
    });
    if (maxItems && items.length > maxItems) {
      var restAmount = items.slice(maxItems - 1).reduce(function (sum, item) {
        return sum + item.amount;
      }, 0);
      items = items.slice(0, maxItems - 1).concat([{ id: "_rest", name: "Lainnya", color: REST_COLOR, amount: restAmount }]);
    }
    items.forEach(function (item) {
      item.percent = total > 0 ? (item.amount / total) * 100 : 0;
    });
    return { items: items, total: total };
  }

  function sortedTransactions(transactions) {
    return transactions.slice().sort(function (a, b) {
      return (b.date + b.time).localeCompare(a.date + a.time);
    });
  }

  function themeColor() {
    return state.settings.darkMode ? "#0C1512" : "#F4F6F3";
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.settings.darkMode ? "dark" : "light");
    if (els.themeColorMeta) els.themeColorMeta.setAttribute("content", themeColor());
  }

  function syncBodyLock() {
    var open = ui.addOpen || els.sheetWrap.classList.contains("is-open") || els.dialogWrap.classList.contains("is-open");
    document.body.classList.toggle("is-locked", open);
  }

  function toast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2300);
  }

  function openSheet(title, html) {
    els.sheetTitle.textContent = title;
    els.sheetBody.innerHTML = html;
    els.sheetBody.scrollTop = 0;
    els.sheetWrap.classList.add("is-open");
    els.sheetWrap.setAttribute("aria-hidden", "false");
    syncBodyLock();
  }

  function closeSheet() {
    els.sheetWrap.classList.remove("is-open");
    els.sheetWrap.setAttribute("aria-hidden", "true");
    els.sheetBody.innerHTML = "";
    ui.detailId = null;
    syncBodyLock();
  }

  function openDialog(title, message, confirmLabel, onConfirm) {
    els.dialogTitle.textContent = title;
    els.dialogMessage.textContent = message;
    els.dialogConfirm.textContent = confirmLabel || "Hapus";
    dialogAction = onConfirm;
    els.dialogWrap.classList.add("is-open");
    els.dialogWrap.setAttribute("aria-hidden", "false");
    syncBodyLock();
  }

  function closeDialog() {
    els.dialogWrap.classList.remove("is-open");
    els.dialogWrap.setAttribute("aria-hidden", "true");
    dialogAction = null;
    syncBodyLock();
  }

  function showScreen(name) {
    if (SCREENS.indexOf(name) < 0) name = "beranda";
    ui.screen = name;
    els.screens.forEach(function (screen) {
      screen.classList.toggle("is-active", screen.getAttribute("data-screen") === name);
    });
    els.navItems.forEach(function (item) {
      item.classList.toggle("is-active", item.getAttribute("data-tab") === name);
    });
    renderScreen(name);
    window.scrollTo(0, 0);
  }

  function goTab(name) {
    showScreen(name);
    try {
      window.history.replaceState(null, "", "#/" + name);
    } catch (error) {
      /* ignore */
    }
  }

  function renderScreen(name) {
    if (name === "beranda") renderBeranda();
    if (name === "riwayat") renderRiwayat();
    if (name === "laporan") renderLaporan();
    if (name === "pengaturan") renderPengaturan();
  }

  function emptyState(title, text, icon) {
    return '<div class="empty-state"><div class="empty-icon">' + iconSvg(icon || "wallet") + "</div><h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(text) + "</p></div>";
  }

  function transactionRow(tx, relative) {
    var category = categoryById(tx.categoryId);
    var meta = category.name + " · " + (relative && tx.date !== isoDate(new Date()) ? relativeDay(tx.date) : tx.time);
    return '<button type="button" class="tx-row" data-tx="' + escapeHtml(tx.id) + '">' +
      '<span class="tx-icon" style="--cat:' + category.color + '">' + iconSvg(category.icon) + "</span>" +
      '<span class="tx-main"><span class="tx-title">' + escapeHtml(transactionTitle(tx)) + '</span><span class="tx-meta">' + escapeHtml(meta) + "</span></span>" +
      '<span class="tx-amount' + (tx.type === "income" ? " is-income" : "") + '">' + escapeHtml(transactionAmount(tx)) + "</span>" +
      "</button>";
  }

  function categoryCardHTML(items) {
    if (!items.length) {
      return '<p class="empty-inline">Belum ada pengeluaran pada periode ini.</p>';
    }
    var stack = items.map(function (item) {
      return '<span style="width:' + item.percent.toFixed(2) + "%;background:" + item.color + '" title="' + escapeHtml(item.name) + ": " + Math.round(item.percent) + '%"></span>';
    }).join("");
    var legend = items.map(function (item) {
      return '<div class="cat-legend-item"><span class="cat-dot" style="background:' + item.color + '"></span><span class="cat-name">' + escapeHtml(item.name) + '</span><span class="cat-pct">' + Math.round(item.percent) + "%</span></div>";
    }).join("");
    return '<div class="cat-stack">' + stack + "</div>" + '<div class="cat-legend">' + legend + "</div>";
  }

  function renderBeranda() {
    var transactions = monthTransactions(ui.selectedMonth);
    var total = sumAmount(transactions, "expense");
    var today = isoDate(new Date());
    var todayTotal = state.transactions.reduce(function (sum, tx) {
      return tx.type === "expense" && tx.date === today ? sum + tx.amount : sum;
    }, 0);
    var budget = state.settings.monthlyBudget;
    var percent = budget > 0 ? (total / budget) * 100 : 0;
    var remaining = budget - total;
    var isCurrent = ui.selectedMonth === currentMonthKey();
    var breakdown = categoryBreakdown(transactions, 5);
    var latest = sortedTransactions(transactions).slice(0, 3);

    els.monthLabel.textContent = friendlyMonth(ui.selectedMonth);

    var html = '<section class="summary-card">' +
      '<div class="summary-label">Total pengeluaran</div>' +
      '<div class="summary-amount">' + formatRp(total) + "</div>";

    if (budget > 0) {
      html += '<div class="budget-track"><span style="width:' + Math.max(0, Math.min(100, percent)).toFixed(1) + '%"></span></div>' +
        '<div class="budget-info"><span>Terpakai ' + Math.round(percent) + "% dari " + formatRp(budget) + "</span>" +
        '<span class="budget-left' + (remaining < 0 ? " is-over" : "") + '">' +
        (remaining < 0 ? "Lewat " + formatRp(-remaining) : "Sisa " + formatRp(remaining)) +
        "</span></div>";
    } else {
      html += '<div class="budget-track"><span style="width:0%"></span></div>' +
        '<div class="budget-info"><span>Budget bulanan belum diatur</span></div>';
    }

    html += '<div class="summary-divider"></div>' +
      '<div class="today-row"><span>' + (isCurrent ? "Hari ini" : "Transaksi") + "</span><b>" +
      (isCurrent ? formatRp(todayTotal) : transactions.length + " catatan") +
      "</b></div></section>";

    if (state.settings.warningEnabled && budget > 0 && total >= budget * 0.8) {
      var warningText = remaining < 0
        ? "Pengeluaran sudah melewati budget sebesar " + formatRp(-remaining) + "."
        : "Budget hampir habis. Sisa " + formatRp(remaining) + " dari " + formatRp(budget) + ".";
      html += '<div class="warning-banner">' + iconSvg("warning") + "<span>" + escapeHtml(warningText) + "</span></div>";
    }

    html += '<section class="card category-card">' +
      '<div class="card-head"><h2>Per kategori</h2><button type="button" class="link-btn" data-action="open-report">Lihat laporan</button></div>' +
      categoryCardHTML(breakdown.items) +
      "</section>";

    html += '<div class="section-head"><h2>Transaksi terakhir</h2><button type="button" class="link-btn" data-action="open-history">Lihat semua</button></div>';

    if (latest.length) {
      html += '<div class="card tx-card">' + latest.map(function (tx) {
        return transactionRow(tx, true);
      }).join("") + "</div>";
    } else {
      html += '<div class="card tx-card">' + emptyState("Belum ada transaksi", "Tekan tombol + untuk mencatat pengeluaran pertamamu.", "wallet") + "</div>";
    }

    els.berandaBody.innerHTML = html;
  }

  function matchesQuery(tx, query) {
    if (!query) return true;
    var category = categoryById(tx.categoryId);
    var text = [
      tx.note,
      category.name,
      tx.payment,
      String(tx.amount),
      formatNumber(tx.amount),
      fullDate(tx.date),
      relativeDay(tx.date)
    ].join(" ").toLowerCase();
    return text.indexOf(query) >= 0;
  }

  function renderRiwayat() {
    var query = ui.search.trim().toLowerCase();
    var transactions = sortedTransactions(state.transactions).filter(function (tx) {
      return matchesQuery(tx, query);
    });

    if (!transactions.length) {
      els.riwayatBody.innerHTML = query
        ? emptyState("Tidak ditemukan", "Coba kata kunci lain atau periksa ejaan pencarianmu.", "dots")
        : emptyState("Belum ada transaksi", "Tekan tombol + untuk mencatat pengeluaran pertamamu.", "wallet");
      return;
    }

    var groups = {};
    transactions.forEach(function (tx) {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });

    var html = Object.keys(groups).sort().reverse().map(function (date) {
      var dayTransactions = groups[date];
      var expense = sumAmount(dayTransactions, "expense");
      var income = sumAmount(dayTransactions, "income");
      var totalText = expense > 0 ? "\u2212" + formatRp(expense) : "+" + formatRp(income);
      var totalClass = expense > 0 ? "" : " is-income";
      return '<section class="day-group"><div class="day-head"><span class="day-label">' + escapeHtml(relativeDay(date)) + "</span>" +
        '<span class="day-total' + totalClass + '">' + totalText + "</span></div>" +
        '<div class="card tx-card">' + dayTransactions.map(function (tx) {
          return transactionRow(tx, false);
        }).join("") + "</div></section>";
    }).join("");

    els.riwayatBody.innerHTML = html;
  }

  function updateReportTabs() {
    els.reportButtons.forEach(function (button) {
      var active = button.getAttribute("data-period") === ui.period;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function reportRange(period) {
    var nowKey = currentMonthKey();
    if (period === "year") {
      var year = Number(ui.selectedMonth.slice(0, 4));
      var currentYear = new Date().getFullYear();
      return {
        start: year + "-01-01",
        end: year + "-12-31",
        prevStart: (year - 1) + "-01-01",
        prevEnd: (year - 1) + "-12-31",
        prevLabel: year === currentYear ? "Tahun lalu" : String(year - 1),
        prevLower: year === currentYear ? "tahun lalu" : String(year - 1)
      };
    }
    if (period === "week") {
      var endDate = ui.selectedMonth === nowKey ? new Date() : endOfMonth(ui.selectedMonth);
      var startDate = addDays(endDate, -6);
      var prevEndDate = addDays(startDate, -1);
      var prevStartDate = addDays(prevEndDate, -6);
      return {
        start: isoDate(startDate),
        end: isoDate(endDate),
        prevStart: isoDate(prevStartDate),
        prevEnd: isoDate(prevEndDate),
        prevLabel: "7 hari sebelumnya",
        prevLower: "7 hari sebelumnya"
      };
    }
    var previous = previousMonthKey(ui.selectedMonth);
    return {
      start: isoDate(startOfMonth(ui.selectedMonth)),
      end: isoDate(endOfMonth(ui.selectedMonth)),
      prevStart: isoDate(startOfMonth(previous)),
      prevEnd: isoDate(endOfMonth(previous)),
      prevLabel: ui.selectedMonth === nowKey ? "Bulan lalu" : monthName(previous),
      prevLower: ui.selectedMonth === nowKey ? "bulan lalu" : monthName(previous)
    };
  }

  function reportTitle(period) {
    if (period === "week") return "Total pengeluaran 7 hari terakhir";
    if (period === "year") {
      var year = Number(ui.selectedMonth.slice(0, 4));
      return "Total pengeluaran " + (year === new Date().getFullYear() ? "tahun ini" : String(year));
    }
    return ui.selectedMonth === currentMonthKey() ? "Total pengeluaran bulan ini" : "Total pengeluaran " + monthName(ui.selectedMonth);
  }

  function comparisonHTML(current, previous, lowerLabel) {
    if (previous <= 0) {
      return '<div class="compare-pill is-flat"><span>' + (current > 0 ? "Belum ada data pembanding." : "Belum ada pengeluaran pada periode ini.") + "</span></div>";
    }
    var difference = current - previous;
    var percent = Math.round((Math.abs(difference) / previous) * 100);
    if (difference === 0) {
      return '<div class="compare-pill is-flat"><span>Sama dengan ' + escapeHtml(lowerLabel) + ".</span></div>";
    }
    if (difference < 0) {
      return '<div class="compare-pill">' + iconSvg("arrowDown") + "<span>" + formatRp(Math.abs(difference)) +
        " (" + percent + "%) lebih rendah dari " + escapeHtml(lowerLabel) + "</span></div>";
    }
    return '<div class="compare-pill is-up">' + iconSvg("arrowUp") + "<span>" + formatRp(difference) +
      " (" + percent + "%) lebih tinggi dari " + escapeHtml(lowerLabel) + "</span></div>";
  }

  function chartBars(period) {
    var bars = [];
    var today = isoDate(new Date());
    var now = new Date();
    var max = 1;
    if (period === "year") {
      var year = Number(ui.selectedMonth.slice(0, 4));
      for (var month = 0; month < 12; month++) {
        var key = year + "-" + pad2(month + 1);
        var amount = sumAmount(monthTransactions(key), "expense");
        bars.push({
          label: MONTHS_SHORT[month],
          amount: amount,
          isToday: year === now.getFullYear() && month === now.getMonth()
        });
      }
    } else {
      var endDate = ui.selectedMonth === currentMonthKey() ? new Date() : endOfMonth(ui.selectedMonth);
      for (var offset = 6; offset >= 0; offset--) {
        var date = addDays(endDate, -offset);
        var iso = isoDate(date);
        var dayAmount = state.transactions.reduce(function (sum, tx) {
          return tx.type === "expense" && tx.date === iso ? sum + tx.amount : sum;
        }, 0);
        bars.push({
          label: DAYS_SHORT[date.getDay()],
          amount: dayAmount,
          isToday: iso === today
        });
      }
    }
    bars.forEach(function (bar) {
      if (bar.amount > max) max = bar.amount;
    });
    bars.forEach(function (bar) {
      bar.height = bar.amount > 0 ? Math.max(4, (bar.amount / max) * 100) : 0;
    });
    return bars;
  }

  function renderLaporan() {
    updateReportTabs();
    var range = reportRange(ui.period);
    var currentTransactions = state.transactions.filter(function (tx) {
      return tx.type === "expense" && tx.date >= range.start && tx.date <= range.end;
    });
    var previousTransactions = state.transactions.filter(function (tx) {
      return tx.type === "expense" && tx.date >= range.prevStart && tx.date <= range.prevEnd;
    });
    var total = sumAmount(currentTransactions, "expense");
    var previousTotal = sumAmount(previousTransactions, "expense");
    var breakdown = categoryBreakdown(currentTransactions, 5);

    var html = '<section class="card report-card">' +
      '<div class="report-label">' + escapeHtml(reportTitle(ui.period)) + "</div>" +
      '<div class="report-amount">' + formatRp(total) + "</div>" +
      comparisonHTML(total, previousTotal, range.prevLower) +
      '<p class="prev-total">' + escapeHtml(range.prevLabel) + ": " + formatRp(previousTotal) + "</p>" +
      "</section>";

    html += '<section class="card donut-card"><div class="card-head"><h2>Per kategori</h2></div>';

    if (breakdown.items.length) {
      html += '<div class="donut-wrap">' + Charts.donut(breakdown.items) +
        '<div class="donut-center"><span>Total</span><strong>' + compactNumber(breakdown.total) + "</strong></div></div>" +
        '<ul class="legend-list">' + breakdown.items.map(function (item) {
          return '<li class="legend-row"><span class="cat-dot" style="background:' + item.color + '"></span>' +
            '<span class="legend-name">' + escapeHtml(item.name) + "</span>" +
            '<span class="legend-amount">' + formatRp(item.amount) + "</span>" +
            '<span class="legend-pct">' + Math.round(item.percent) + "%</span></li>";
        }).join("") + "</ul>";
    } else {
      html += emptyState("Belum ada data", "Pengeluaran akan muncul di sini setelah kamu mencatat transaksi.", "wallet");
    }

    html += "</section>";

    var bars = chartBars(ui.period);
    var chartTotal = bars.reduce(function (sum, bar) {
      return sum + bar.amount;
    }, 0);
    html += '<section class="card chart7-card">' +
      '<div class="card-head"><h2>' + (ui.period === "year" ? "Per bulan" : "7 hari terakhir") + "</h2>" +
      '<span class="chart7-total">' + formatRp(chartTotal) + "</span></div>" +
      '<div class="day-bars' + (ui.period === "year" ? " is-year" : "") + '">' +
      bars.map(function (bar) {
        return '<div class="day-bar' + (bar.isToday ? " is-today" : "") + '" title="' + escapeHtml(bar.label + ": " + formatRp(bar.amount)) + '">' +
          '<div class="day-bar-track"><span style="height:' + bar.height.toFixed(1) + '%"></span></div>' +
          '<span class="day-bar-label">' + bar.label + "</span></div>";
      }).join("") + "</div></section>";

    els.laporanBody.innerHTML = html;
  }

  function settingsButton(action, title, subtitle, right) {
    return '<button type="button" class="settings-row" data-action="' + action + '">' +
      '<span class="settings-copy"><span class="settings-title">' + escapeHtml(title) + '</span><span class="settings-sub">' + escapeHtml(subtitle) + "</span></span>" +
      (right || "") + iconSvg("chevron", "settings-chevron") + "</button>";
  }

  function settingsSwitch(action, title, subtitle, isOn) {
    return '<button type="button" class="settings-row" data-action="' + action + '" role="switch" aria-checked="' + (isOn ? "true" : "false") + '">' +
      '<span class="settings-copy"><span class="settings-title">' + escapeHtml(title) + '</span><span class="settings-sub">' + escapeHtml(subtitle) + "</span></span>" +
      '<span class="switch' + (isOn ? " is-on" : "") + '"></span></button>';
  }

  function settingsDisabled(title, subtitle) {
    return '<div class="settings-row is-disabled"><span class="settings-copy"><span class="settings-title">' +
      escapeHtml(title) + '</span><span class="settings-sub">' + escapeHtml(subtitle) + '</span></span><span class="badge-later">Nanti</span></div>';
  }

  function settingsSection(label, content) {
    return '<section class="settings-section"><div class="settings-label">' + escapeHtml(label) + '</div><div class="settings-card">' + content + "</div></section>";
  }

  function renderPengaturan() {
    var budget = state.settings.monthlyBudget > 0
      ? '<span class="settings-value">' + formatRp(state.settings.monthlyBudget) + "</span>"
      : '<span class="settings-value">Belum diatur</span>';

    var html = settingsSection("Budget",
      settingsButton("budget-month", "Budget bulanan", "Total semua kategori", budget) +
      settingsButton("budget-categories", "Budget per kategori", "Atur batas untuk tiap kategori") +
      settingsSwitch("toggle-warning", "Peringatan hampir habis", "Beri tahu saat sisa budget tinggal 20%", state.settings.warningEnabled)
    );

    html += settingsSection("Kategori",
      settingsButton("manage-categories", "Kelola kategori", state.categories.length + " kategori · ubah nama, ikon, dan warna")
    );

    html += settingsSection("Data dan tampilan",
      settingsButton("backup-data", "Cadangkan data", "Simpan salinan semua transaksi ke file") +
      settingsButton("restore-data", "Pulihkan data", "Ambil dari file cadangan") +
      settingsSwitch("toggle-dark", "Mode gelap", "Tampilan lebih nyaman di malam hari", state.settings.darkMode)
    );

    html += settingsSection("Segera hadir",
      settingsDisabled("Kunci aplikasi", "PIN atau sidik jari") +
      settingsDisabled("Pengingat harian", "Ingatkan mencatat setiap hari")
    );

    html += settingsSection("Lainnya",
      settingsButton("clear-data", "Hapus semua transaksi", "Kosongkan riwayat tanpa menghapus kategori") +
      settingsButton("seed-data", "Muat ulang data contoh", "Kembalikan data demo dan pengaturan awal")
    );

    els.pengaturanBody.innerHTML = html;
  }

  function updateAmountDisplay() {
    els.amountValue.textContent = ui.amount > 0 ? formatNumber(ui.amount) : "0";
    els.amountValue.classList.toggle("is-empty", ui.amount <= 0);
    els.saveTx.textContent = ui.editId
      ? "Simpan perubahan"
      : "Simpan " + (ui.addType === "income" ? "pemasukan" : "pengeluaran");
  }

  function renderAdd() {
    var categories = categoriesFor(ui.addType);
    if (!categories.some(function (category) { return category.id === ui.categoryId; })) {
      ui.categoryId = categories[0] ? categories[0].id : "makan";
    }

    els.addTitle.textContent = ui.editId ? "Edit transaksi" : "Tambah transaksi";

    els.typeToggle.querySelectorAll(".seg-btn").forEach(function (button) {
      var active = button.getAttribute("data-type") === ui.addType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    els.categoryGrid.innerHTML = categories.map(function (category) {
      var selected = category.id === ui.categoryId;
      return '<button type="button" class="cat-card' + (selected ? " is-selected" : "") + '" data-cat="' + escapeHtml(category.id) + '" style="--cat:' + category.color + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
        iconSvg(category.icon) + "<span>" + escapeHtml(category.name) + "</span></button>";
    }).join("");

    els.dateBtnLabel.textContent = friendlyDate(ui.date);
    els.paymentBtnLabel.textContent = ui.payment;
    els.noteInput.value = ui.note;
    updateAmountDisplay();
  }

  function openAdd(tx) {
    if (els.sheetWrap.classList.contains("is-open")) closeSheet();
    ui.addOpen = true;
    ui.editId = tx ? tx.id : null;
    ui.addType = tx ? tx.type : "expense";
    ui.amount = tx ? tx.amount : 0;
    ui.note = tx ? tx.note : "";
    ui.date = tx ? tx.date : isoDate(new Date());
    ui.time = tx ? tx.time : nowTime();
    ui.payment = tx ? tx.payment : "Tunai";
    ui.categoryId = tx ? tx.categoryId : "makan";
    renderAdd();
    els.addScreen.classList.add("is-open");
    els.addScreen.setAttribute("aria-hidden", "false");
    els.addScreen.scrollTop = 0;
    syncBodyLock();
  }

  function closeAdd() {
    ui.addOpen = false;
    ui.editId = null;
    els.addScreen.classList.remove("is-open");
    els.addScreen.setAttribute("aria-hidden", "true");
    syncBodyLock();
  }

  function shakeAmount() {
    els.amountDisplay.classList.remove("is-shake");
    void els.amountDisplay.offsetWidth;
    els.amountDisplay.classList.add("is-shake");
    window.setTimeout(function () {
      els.amountDisplay.classList.remove("is-shake");
    }, 360);
  }

  function pushAmount(key) {
    if (key === "back") {
      ui.amount = Math.floor(ui.amount / 10);
    } else if (key === "000") {
      if (ui.amount > 0) ui.amount = Math.min(ui.amount * 1000, 999999999999);
    } else {
      var digit = Number(key);
      if (!Number.isFinite(digit)) return;
      if (ui.amount === 0 && digit === 0) {
        updateAmountDisplay();
        return;
      }
      if (String(ui.amount).length >= 12) return;
      var next = ui.amount * 10 + digit;
      if (next > 999999999999) return;
      ui.amount = next;
    }
    updateAmountDisplay();
  }

  function setAddType(type) {
    if (type !== "income") type = "expense";
    if (ui.addType === type) return;
    ui.addType = type;
    var categories = categoriesFor(type);
    ui.categoryId = categories[0] ? categories[0].id : "makan";
    renderAdd();
  }

  function selectCategory(id) {
    var exists = categoriesFor(ui.addType).some(function (category) {
      return category.id === id;
    });
    if (!exists) return;
    ui.categoryId = id;
    els.categoryGrid.querySelectorAll(".cat-card").forEach(function (button) {
      var selected = button.getAttribute("data-cat") === id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function saveTransaction() {
    if (ui.amount <= 0) {
      shakeAmount();
      toast("Masukkan nominal terlebih dahulu.");
      return;
    }
    var categories = categoriesFor(ui.addType);
    if (!categories.length) {
      toast("Kategori belum tersedia.");
      return;
    }
    if (!categories.some(function (category) { return category.id === ui.categoryId; })) {
      ui.categoryId = categories[0].id;
    }

    var wasEdit = Boolean(ui.editId);
    var note = ui.note.trim().slice(0, 80);

    if (wasEdit) {
      var existing = state.transactions.find(function (tx) {
        return tx.id === ui.editId;
      });
      if (!existing) {
        closeAdd();
        toast("Transaksi tidak ditemukan.");
        return;
      }
      existing.type = ui.addType;
      existing.amount = ui.amount;
      existing.categoryId = ui.categoryId;
      existing.date = ui.date;
      existing.payment = ui.payment;
      existing.note = note;
      Store.save();
    } else {
      state.transactions.push({
        id: Store.uid("tx"),
        type: ui.addType,
        amount: ui.amount,
        categoryId: ui.categoryId,
        date: ui.date,
        time: ui.time || nowTime(),
        payment: ui.payment,
        note: note
      });
      Store.save();
    }

    var savedType = ui.addType;
    closeAdd();
    renderScreen(ui.screen);
    toast(wasEdit ? "Perubahan disimpan." : (savedType === "income" ? "Pemasukan ditambahkan." : "Pengeluaran ditambahkan."));
  }

  function applyMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      toast("Pilih bulan yang valid.");
      return;
    }
    ui.selectedMonth = value;
    closeSheet();
    renderScreen(ui.screen);
  }

  function openMonthSheet() {
    var current = currentMonthKey();
    var previous = previousMonthKey(current);
    openSheet("Pilih bulan",
      '<div class="date-quick">' +
      '<button type="button" class="quick-chip' + (ui.selectedMonth === current ? " is-selected" : "") + '" data-action="month-quick" data-month="' + current + '">Bulan ini</button>' +
      '<button type="button" class="quick-chip' + (ui.selectedMonth === previous ? " is-selected" : "") + '" data-action="month-quick" data-month="' + previous + '">Bulan lalu</button>' +
      "</div>" +
      '<div class="field-group"><label for="sheetMonthInput">Bulan</label>' +
      '<input class="field-input" type="month" id="sheetMonthInput" value="' + ui.selectedMonth + '" max="' + current + '"></div>' +
      '<div class="sheet-actions"><button type="button" class="btn-primary small" data-action="month-apply">Terapkan</button></div>'
    );
  }

  function applyDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      toast("Pilih tanggal yang valid.");
      return;
    }
    ui.date = value;
    els.dateBtnLabel.textContent = friendlyDate(value);
    closeSheet();
  }

  function openDateSheet() {
    var today = isoDate(new Date());
    var yesterday = isoDate(addDays(new Date(), -1));
    openSheet("Pilih tanggal",
      '<div class="date-quick">' +
      '<button type="button" class="quick-chip' + (ui.date === today ? " is-selected" : "") + '" data-action="date-quick" data-date="' + today + '">Hari ini</button>' +
      '<button type="button" class="quick-chip' + (ui.date === yesterday ? " is-selected" : "") + '" data-action="date-quick" data-date="' + yesterday + '">Kemarin</button>' +
      "</div>" +
      '<div class="field-group"><label for="sheetDateInput">Tanggal transaksi</label>' +
      '<input class="field-input" type="date" id="sheetDateInput" value="' + ui.date + '" max="' + today + '"></div>' +
      '<div class="sheet-actions"><button type="button" class="btn-primary small" data-action="date-apply">Terapkan</button></div>'
    );
  }

  function openPaymentSheet() {
    openSheet("Metode pembayaran",
      '<ul class="option-list">' + Store.PAYMENT_METHODS.map(function (method) {
        return '<li><button type="button" class="option-row" data-action="payment-select" data-payment="' + escapeHtml(method.id) + '">' +
          '<span class="option-icon">' + iconSvg(method.icon) + "</span>" +
          '<span class="option-copy"><span class="option-title">' + escapeHtml(method.id) + "</span></span>" +
          (ui.payment === method.id ? iconSvg("check", "option-check") : "") +
          "</button></li>";
      }).join("") + "</ul>"
    );
  }

  function selectPayment(id) {
    var exists = Store.PAYMENT_METHODS.some(function (method) {
      return method.id === id;
    });
    if (!exists) return;
    ui.payment = id;
    els.paymentBtnLabel.textContent = id;
    closeSheet();
  }

  function detailItem(label, value) {
    return '<div class="detail-item"><span>' + escapeHtml(label) + "</span><b>" + escapeHtml(value) + "</b></div>";
  }

  function openTransactionSheet(id) {
    var tx = state.transactions.find(function (item) {
      return item.id === id;
    });
    if (!tx) return;
    ui.detailId = tx.id;
    var category = categoryById(tx.categoryId);
    var html = '<div class="detail-sheet">' +
      '<div class="detail-hero"><span class="cat-manager-icon" style="--cat:' + category.color + '">' + iconSvg(category.icon) + "</span>" +
      '<div class="detail-title">' + escapeHtml(transactionTitle(tx)) + "</div>" +
      '<div class="detail-meta">' + escapeHtml(category.name + " · " + fullDate(tx.date) + " · " + tx.time) + "</div>" +
      '<div class="detail-amount' + (tx.type === "income" ? " is-income" : "") + '">' + escapeHtml(transactionAmount(tx)) + "</div></div>" +
      '<div class="detail-list">' +
      detailItem("Kategori", category.name) +
      detailItem("Tanggal", fullDate(tx.date) + " · " + tx.time) +
      detailItem("Metode", tx.payment) +
      detailItem("Catatan", tx.note || "—") +
      "</div>" +
      '<div class="detail-actions">' +
      '<button type="button" class="btn-soft" data-action="tx-edit">' + iconSvg("edit") + " Edit</button>" +
      '<button type="button" class="btn-danger" data-action="tx-delete">' + iconSvg("trash") + " Hapus</button>" +
      "</div></div>";
    openSheet("Detail transaksi", html);
  }

  function editCurrentTransaction() {
    var tx = state.transactions.find(function (item) {
      return item.id === ui.detailId;
    });
    if (!tx) {
      closeSheet();
      return;
    }
    closeSheet();
    openAdd(tx);
  }

  function askDeleteTransaction() {
    var id = ui.detailId;
    var tx = state.transactions.find(function (item) {
      return item.id === id;
    });
    if (!tx) return;
    openDialog("Hapus transaksi?", 'Transaksi "' + transactionTitle(tx) + '" akan dihapus permanen.', "Hapus", function () {
      state.transactions = state.transactions.filter(function (item) {
        return item.id !== id;
      });
      Store.save();
      closeSheet();
      renderScreen(ui.screen);
      toast("Transaksi dihapus.");
    });
  }

  function openBudgetSheet() {
    var value = state.settings.monthlyBudget > 0 ? String(state.settings.monthlyBudget) : "";
    openSheet("Budget bulanan",
      '<div class="field-group"><label for="budgetField">Batas pengeluaran per bulan</label>' +
      '<div class="amount-input-wrap"><span>Rp</span><input class="field-input" id="budgetField" type="text" inputmode="numeric" autocomplete="off" value="' + value + '" placeholder="0"></div></div>' +
      '<p class="sheet-note">Budget dipakai untuk menghitung sisa dan peringatan di Beranda.</p>' +
      '<div class="sheet-actions"><button type="button" class="btn-primary small" data-action="budget-save">Simpan budget</button>' +
      (state.settings.monthlyBudget > 0 ? '<button type="button" class="btn-danger" data-action="budget-clear">Hapus budget</button>' : "") +
      "</div>"
    );
  }

  function saveBudget() {
    var input = byId("budgetField");
    var digits = input ? input.value.replace(/\D/g, "") : "";
    var value = Math.min(Number(digits || 0), 999999999999);
    Store.saveSettings({ monthlyBudget: Math.round(value) });
    closeSheet();
    renderPengaturan();
    toast(value > 0 ? "Budget bulanan disimpan." : "Budget bulanan dihapus.");
  }

  function clearBudget() {
    Store.saveSettings({ monthlyBudget: 0 });
    closeSheet();
    renderPengaturan();
    toast("Budget bulanan dihapus.");
  }

  function openCategoryBudgetsSheet() {
    var month = currentMonthKey();
    var spent = {};
    monthTransactions(month).forEach(function (tx) {
      if (tx.type !== "expense") return;
      spent[tx.categoryId] = (spent[tx.categoryId] || 0) + tx.amount;
    });

    var rows = state.categories.map(function (category) {
      var budget = state.settings.categoryBudgets[category.id] || 0;
      var used = spent[category.id] || 0;
      var percent = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
      return '<div class="budget-list-item">' +
        '<div class="budget-list-top"><span class="cat-manager-icon" style="--cat:' + category.color + '">' + iconSvg(category.icon) + "</span>" +
        '<span class="budget-list-copy"><span class="budget-list-name">' + escapeHtml(category.name) + "</span>" +
        '<span class="budget-list-sub">Terpakai ' + formatRp(used) + (budget > 0 ? " dari " + formatRp(budget) : "") + "</span></span>" +
        '<input class="budget-input" data-budget-cat="' + escapeHtml(category.id) + '" type="text" inputmode="numeric" autocomplete="off" value="' + (budget > 0 ? budget : "") + '" placeholder="Tanpa batas" aria-label="Budget ' + escapeHtml(category.name) + '">' +
        "</div>" +
        (budget > 0 ? '<div class="budget-mini-track"><span class="' + (used > budget ? "is-over" : "") + '" style="width:' + percent.toFixed(1) + '%"></span></div>' : "") +
        "</div>";
    }).join("");

    openSheet("Budget per kategori",
      rows +
      '<p class="sheet-note" style="margin-top:14px">Kosongkan kolom untuk menghapus batas kategori. Budget per kategori dihitung untuk bulan ini.</p>' +
      '<div class="sheet-actions"><button type="button" class="btn-primary small" data-action="cat-budgets-save">Simpan budget kategori</button></div>'
    );
  }

  function saveCategoryBudgets() {
    var budgets = {};
    els.sheetBody.querySelectorAll(".budget-input[data-budget-cat]").forEach(function (input) {
      var id = input.getAttribute("data-budget-cat");
      var digits = input.value.replace(/\D/g, "");
      var value = Math.min(Number(digits || 0), 999999999999);
      if (value > 0) budgets[id] = Math.round(value);
    });
    Store.saveSettings({ categoryBudgets: budgets });
    closeSheet();
    renderPengaturan();
    toast("Budget kategori disimpan.");
  }

  function openCategoryManagerSheet() {
    var rows = state.categories.map(function (category) {
      return '<button type="button" class="cat-manager-row" data-action="cat-edit" data-cat="' + escapeHtml(category.id) + '">' +
        '<span class="cat-manager-icon" style="--cat:' + category.color + '">' + iconSvg(category.icon) + "</span>" +
        '<span class="cat-manager-name">' + escapeHtml(category.name) + "</span>" +
        iconSvg("chevron", "settings-chevron") + "</button>";
    }).join("");
    openSheet("Kelola kategori",
      rows + '<button type="button" class="add-category-btn" data-action="cat-add">' + iconSvg("plus") + " Tambah kategori</button>"
    );
  }

  function renderCategoryEditor() {
    var draft = ui.categoryDraft;
    if (!draft) return;
    var icons = ICON_NAMES.slice();
    if (icons.indexOf(draft.icon) < 0) icons.unshift(draft.icon);
    var colors = COLOR_OPTIONS.slice();
    if (colors.indexOf(draft.color) < 0) colors.unshift(draft.color);

    openSheet(ui.categoryEditId ? "Ubah kategori" : "Tambah kategori",
      '<div class="cat-preview"><span class="cat-manager-icon" id="catPreviewIcon" style="--cat:' + escapeHtml(draft.color) + '">' + iconSvg(draft.icon) + "</span>" +
      '<div><div class="cat-preview-name" id="catPreviewName">' + escapeHtml(draft.name.trim() || "Kategori baru") + '</div><div class="cat-preview-sub">Pratinjau kategori</div></div></div>' +
      '<div class="field-group"><label for="catName">Nama kategori</label>' +
      '<input class="field-input" id="catName" maxlength="24" autocomplete="off" value="' + escapeHtml(draft.name) + '" placeholder="Contoh: Pendidikan"></div>' +
      '<div class="picker-title">Ikon</div><div class="icon-grid">' +
      icons.map(function (name) {
        return '<button type="button" class="icon-option' + (name === draft.icon ? " is-selected" : "") + '" data-action="icon-select" data-icon="' + name + '" aria-label="Ikon ' + name + '" aria-pressed="' + (name === draft.icon ? "true" : "false") + '">' + iconSvg(name) + "</button>";
      }).join("") + "</div>" +
      '<div class="picker-title">Warna</div><div class="color-grid">' +
      colors.map(function (color) {
        return '<button type="button" class="color-option' + (color === draft.color ? " is-selected" : "") + '" data-action="color-select" data-color="' + color + '" style="background:' + color + '" aria-label="Warna ' + color + '" aria-pressed="' + (color === draft.color ? "true" : "false") + '"></button>';
      }).join("") + "</div>" +
      '<div class="sheet-actions"><button type="button" class="btn-primary small" data-action="cat-save">Simpan kategori</button>' +
      (ui.categoryEditId ? '<button type="button" class="btn-danger" data-action="cat-delete">Hapus kategori</button>' : "") +
      "</div>"
    );
  }

  function openCategoryEditor(id) {
    var existing = state.categories.find(function (category) {
      return category.id === id;
    });
    ui.categoryEditId = existing ? existing.id : null;
    ui.categoryDraft = existing
      ? { id: existing.id, name: existing.name, icon: existing.icon, color: existing.color }
      : { id: null, name: "", icon: "dots", color: "#0C6E5F" };
    renderCategoryEditor();
  }

  function updateCategoryPreview() {
    if (!ui.categoryDraft) return;
    var preview = byId("catPreviewIcon");
    var name = byId("catPreviewName");
    if (preview) {
      preview.style.setProperty("--cat", ui.categoryDraft.color);
      preview.innerHTML = iconSvg(ui.categoryDraft.icon);
    }
    if (name) name.textContent = ui.categoryDraft.name.trim() || "Kategori baru";
  }

  function selectEditorIcon(name) {
    if (!ICONS[name] || !ui.categoryDraft) return;
    ui.categoryDraft.icon = name;
    els.sheetBody.querySelectorAll(".icon-option").forEach(function (button) {
      var selected = button.getAttribute("data-icon") === name;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    updateCategoryPreview();
  }

  function selectEditorColor(color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color) || !ui.categoryDraft) return;
    ui.categoryDraft.color = color;
    els.sheetBody.querySelectorAll(".color-option").forEach(function (button) {
      var selected = button.getAttribute("data-color") === color;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    updateCategoryPreview();
  }

  function saveCategoryEditor() {
    if (!ui.categoryDraft) return;
    var input = byId("catName");
    var name = (input ? input.value : ui.categoryDraft.name).trim().replace(/\s+/g, " ").slice(0, 24);
    if (!name) {
      toast("Nama kategori wajib diisi.");
      return;
    }
    var duplicate = state.categories.some(function (category) {
      return category.id !== ui.categoryEditId && category.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      toast("Nama kategori sudah dipakai.");
      return;
    }
    var editing = ui.categoryEditId;
    if (editing) {
      var existing = state.categories.find(function (category) {
        return category.id === editing;
      });
      if (existing) {
        existing.name = name;
        existing.icon = ui.categoryDraft.icon;
        existing.color = ui.categoryDraft.color;
      }
    } else {
      state.categories.push({
        id: Store.uid("cat"),
        name: name,
        icon: ui.categoryDraft.icon,
        color: ui.categoryDraft.color
      });
    }
    Store.saveCategories(state.categories);
    ui.categoryEditId = null;
    ui.categoryDraft = null;
    closeSheet();
    renderPengaturan();
    toast(editing ? "Kategori diperbarui." : "Kategori ditambahkan.");
  }

  function askDeleteCategory() {
    var id = ui.categoryEditId;
    if (!id) return;
    var category = state.categories.find(function (item) {
      return item.id === id;
    });
    if (!category) return;
    var used = state.transactions.some(function (tx) {
      return tx.categoryId === id;
    });
    if (used) {
      toast("Kategori masih dipakai transaksi.");
      return;
    }
    if (state.categories.length <= 1) {
      toast("Minimal satu kategori harus tersedia.");
      return;
    }
    openDialog("Hapus kategori?", 'Kategori "' + category.name + '" akan dihapus permanen.', "Hapus", function () {
      state.categories = state.categories.filter(function (item) {
        return item.id !== id;
      });
      Store.saveCategories(state.categories);
      var budgets = Object.assign({}, state.settings.categoryBudgets);
      if (budgets[id]) {
        delete budgets[id];
        Store.saveSettings({ categoryBudgets: budgets });
      }
      ui.categoryEditId = null;
      ui.categoryDraft = null;
      closeSheet();
      renderPengaturan();
      toast("Kategori dihapus.");
    });
  }

  function backupData() {
    var payload = {
      app: "catat",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "catat-backup-" + isoDate(new Date()) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    toast("Cadangan data diunduh.");
  }

  function handleRestoreFile(event) {
    var file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran file cadangan terlalu besar.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (error) {
        toast("File cadangan tidak valid.");
        return;
      }
      var data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || !Array.isArray(data.transactions)) {
        toast("File cadangan tidak valid.");
        return;
      }
      openDialog("Pulihkan data?", "Data saat ini akan diganti dengan isi file cadangan. Tindakan ini tidak bisa dibatalkan.", "Pulihkan", function () {
        state = Store.replaceState(data);
        ui.selectedMonth = currentMonthKey();
        ui.categoryEditId = null;
        ui.categoryDraft = null;
        applyTheme();
        renderScreen(ui.screen);
        toast("Data berhasil dipulihkan.");
      });
    };
    reader.onerror = function () {
      toast("Gagal membaca file cadangan.");
    };
    reader.readAsText(file);
  }

  function toggleWarning() {
    Store.saveSettings({ warningEnabled: !state.settings.warningEnabled });
    renderPengaturan();
    toast(state.settings.warningEnabled ? "Peringatan budget aktif." : "Peringatan budget nonaktif.");
  }

  function toggleDark() {
    Store.saveSettings({ darkMode: !state.settings.darkMode });
    applyTheme();
    renderPengaturan();
    toast(state.settings.darkMode ? "Mode gelap aktif." : "Mode gelap nonaktif.");
  }

  function askClearData() {
    if (!state.transactions.length) {
      toast("Belum ada transaksi untuk dihapus.");
      return;
    }
    openDialog("Hapus semua transaksi?", state.transactions.length + " transaksi akan dihapus permanen. Kategori dan pengaturan tetap tersimpan.", "Hapus", function () {
      Store.clearTransactions();
      renderScreen(ui.screen);
      toast("Semua transaksi dihapus.");
    });
  }

  function askSeedData() {
    openDialog("Muat ulang data contoh?", "Semua transaksi, kategori, dan pengaturan saat ini akan diganti dengan data contoh.", "Muat ulang", function () {
      state = Store.resetToSeed();
      ui.selectedMonth = currentMonthKey();
      ui.categoryEditId = null;
      ui.categoryDraft = null;
      applyTheme();
      renderScreen(ui.screen);
      toast("Data contoh dimuat ulang.");
    });
  }

  function runAction(trigger) {
    var action = trigger.getAttribute("data-action");
    switch (action) {
      case "open-report":
        ui.period = "month";
        goTab("laporan");
        break;
      case "open-history":
        goTab("riwayat");
        break;
      case "month-quick":
        applyMonth(trigger.getAttribute("data-month"));
        break;
      case "month-apply":
        var monthInput = byId("sheetMonthInput");
        if (monthInput) applyMonth(monthInput.value);
        break;
      case "date-quick":
        applyDate(trigger.getAttribute("data-date"));
        break;
      case "date-apply":
        var dateInput = byId("sheetDateInput");
        if (dateInput) applyDate(dateInput.value);
        break;
      case "payment-select":
        selectPayment(trigger.getAttribute("data-payment"));
        break;
      case "budget-month":
        openBudgetSheet();
        break;
      case "budget-categories":
        openCategoryBudgetsSheet();
        break;
      case "budget-save":
        saveBudget();
        break;
      case "budget-clear":
        clearBudget();
        break;
      case "manage-categories":
        openCategoryManagerSheet();
        break;
      case "cat-edit":
        openCategoryEditor(trigger.getAttribute("data-cat"));
        break;
      case "cat-add":
        openCategoryEditor(null);
        break;
      case "icon-select":
        selectEditorIcon(trigger.getAttribute("data-icon"));
        break;
      case "color-select":
        selectEditorColor(trigger.getAttribute("data-color"));
        break;
      case "cat-save":
        saveCategoryEditor();
        break;
      case "cat-delete":
        askDeleteCategory();
        break;
      case "cat-budgets-save":
        saveCategoryBudgets();
        break;
      case "backup-data":
        backupData();
        break;
      case "restore-data":
        els.restoreInput.click();
        break;
      case "toggle-warning":
        toggleWarning();
        break;
      case "toggle-dark":
        toggleDark();
        break;
      case "clear-data":
        askClearData();
        break;
      case "seed-data":
        askSeedData();
        break;
      case "tx-edit":
        editCurrentTransaction();
        break;
      case "tx-delete":
        askDeleteTransaction();
        break;
      default:
        break;
    }
  }

  function handleAppInput(event) {
    if (event.target.id === "catName" && ui.categoryDraft) {
      ui.categoryDraft.name = event.target.value;
      updateCategoryPreview();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      if (els.dialogWrap.classList.contains("is-open")) {
        closeDialog();
        return;
      }
      if (els.sheetWrap.classList.contains("is-open")) {
        closeSheet();
        return;
      }
      if (ui.addOpen) closeAdd();
      return;
    }
    if (!ui.addOpen || els.sheetWrap.classList.contains("is-open") || els.dialogWrap.classList.contains("is-open")) return;
    var tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (/^[0-9]$/.test(event.key)) {
      pushAmount(event.key);
      event.preventDefault();
    } else if (event.key === "Backspace") {
      pushAmount("back");
      event.preventDefault();
    } else if (event.key === "Enter") {
      saveTransaction();
      event.preventDefault();
    }
  }

  function bindEvents() {
    els.navItems.forEach(function (item) {
      item.addEventListener("click", function () {
        goTab(item.getAttribute("data-tab"));
      });
    });

    els.reportButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var period = button.getAttribute("data-period");
        if (period === "week" || period === "month" || period === "year") {
          ui.period = period;
          renderLaporan();
        }
      });
    });

    els.monthTrigger.addEventListener("click", openMonthSheet);
    els.fabAdd.addEventListener("click", function () {
      openAdd();
    });
    els.addBack.addEventListener("click", closeAdd);
    els.saveTx.addEventListener("click", saveTransaction);
    els.dateBtn.addEventListener("click", openDateSheet);
    els.paymentBtn.addEventListener("click", openPaymentSheet);

    els.searchInput.addEventListener("input", function () {
      ui.search = els.searchInput.value;
      renderRiwayat();
    });

    els.noteInput.addEventListener("input", function () {
      ui.note = els.noteInput.value;
    });

    els.typeToggle.addEventListener("click", function (event) {
      var button = event.target.closest(".seg-btn[data-type]");
      if (button) setAddType(button.getAttribute("data-type"));
    });

    els.categoryGrid.addEventListener("click", function (event) {
      var button = event.target.closest(".cat-card[data-cat]");
      if (button) selectCategory(button.getAttribute("data-cat"));
    });

    els.keypad.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-key]");
      if (button) pushAmount(button.getAttribute("data-key"));
    });

    els.sheetWrap.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-sheet]")) closeSheet();
    });

    els.dialogCancel.addEventListener("click", closeDialog);
    els.dialogBackdrop.addEventListener("click", closeDialog);
    els.dialogConfirm.addEventListener("click", function () {
      var action = dialogAction;
      closeDialog();
      if (action) action();
    });

    els.restoreInput.addEventListener("change", handleRestoreFile);
    document.addEventListener("input", handleAppInput);
    document.addEventListener("keydown", handleKeydown);

    document.addEventListener("click", function (event) {
      var action = event.target.closest("[data-action]");
      if (action) {
        runAction(action);
        return;
      }
      var row = event.target.closest("[data-tx]");
      if (row) openTransactionSheet(row.getAttribute("data-tx"));
    });

    window.addEventListener("hashchange", function () {
      var tab = (window.location.hash || "").replace(/^#\/?/, "");
      if (SCREENS.indexOf(tab) >= 0 && !ui.addOpen) showScreen(tab);
    });
  }

  function boot() {
    applyTheme();
    bindEvents();
    var hash = (window.location.hash || "").replace(/^#\/?/, "");
    if (hash === "tambah") {
      ui.screen = "beranda";
      renderScreen("beranda");
      openAdd();
    } else {
      showScreen(SCREENS.indexOf(hash) >= 0 ? hash : "beranda");
    }
    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* offline support akan aktif saat dihosting */
      });
    }
  }

  boot();
})();
