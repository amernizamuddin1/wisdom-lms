// Preload shim for running server-only-guarded modules from plain Node
// scripts (outside Next's build, where webpack normally aliases the
// "server-only" package away). Use via: node/tsx -r scripts/_shims/no-server-only.cjs
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.apply(this, arguments);
};
