"use strict";

var CACHE_NAME = "catat-v7";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/firebase-config.js",
  "./js/boot-lock.js",
  "./js/store.js",
  "./js/charts.js",
  "./js/lock.js",
  "./js/cloud.js",
  "./js/app.js",
  "./js/vendor/firebase-app-compat.js",
  "./js/vendor/firebase-auth-compat.js",
  "./js/vendor/firebase-firestore-compat.js",
  "./assets/fonts/plus-jakarta-sans-400.woff2",
  "./assets/fonts/plus-jakarta-sans-500.woff2",
  "./assets/fonts/plus-jakarta-sans-600.woff2",
  "./assets/fonts/plus-jakarta-sans-700.woff2",
  "./assets/fonts/plus-jakarta-sans-800.woff2",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      });
    })
  );
});
