// Für Prüf-Skripte außerhalb von Next.js: "server-only" ist dort kein Fehler.
const Module = require("module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./server-only-empty.cjs");
  return orig.call(this, request, ...rest);
};
