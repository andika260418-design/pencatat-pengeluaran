(function () {
  "use strict";

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function donut(items) {
    var total = items.reduce(function (sum, item) {
      return sum + Number(item.amount || 0);
    }, 0);

    var size = 200;
    var center = size / 2;
    var radius = 72;
    var stroke = 27;
    var circumference = 2 * Math.PI * radius;
    var gap = items.length > 1 ? 4.5 : 0;
    var offset = 0;
    var segments = "";

    items.forEach(function (item) {
      var amount = Number(item.amount || 0);
      if (amount <= 0 || total <= 0) return;
      var portion = amount / total;
      var length = Math.max(portion * circumference - gap, 0.7);
      var dashOffset = -(offset * circumference + gap / 2);
      segments +=
        '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" ' +
        'stroke="' + escapeXml(item.color) + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + length.toFixed(2) + " " + (circumference - length).toFixed(2) + '" ' +
        'stroke-dashoffset="' + dashOffset.toFixed(2) + '" transform="rotate(-90 ' + center + " " + center + ')">' +
        "<title>" + escapeXml(item.name) + ": " + Math.round(portion * 100) + "%</title></circle>";
      offset += portion;
    });

    return (
      '<svg viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="Diagram kategori pengeluaran">' +
      '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" ' +
      'stroke="var(--soft)" stroke-width="' + stroke + '"></circle>' +
      segments +
      "</svg>"
    );
  }

  window.Charts = {
    donut: donut
  };
})();
