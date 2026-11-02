"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var root = __dirname;
var port = Number(process.env.PORT) || 4173;
var types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

http.createServer(function (request, response) {
  var requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  if (requestPath === "/") requestPath = "/index.html";
  var filePath = path.normalize(path.join(root, requestPath));

  if (filePath.indexOf(root) !== 0) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (error, data) {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(data);
  });
}).listen(port, function () {
  console.log("Catat berjalan di http://localhost:" + port);
});
