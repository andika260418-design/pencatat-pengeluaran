(function () {
  "use strict";

  try {
    var raw = window.localStorage.getItem("catat.lock.v1");
    if (!raw) return;
    var config = JSON.parse(raw);
    if (config && config.enabled) {
      document.documentElement.classList.add("is-app-locked");
    }
  } catch (error) {
    return;
  }
})();
