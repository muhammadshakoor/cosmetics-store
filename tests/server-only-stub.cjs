// Preloaded by `npm test` (node --require). Plain Node is neither a server nor a
// client bundle, so `import 'server-only'` would throw while unit-testing lib/*.
// Next.js still enforces the guard in real builds: importing a guarded module
// from a 'use client' file fails `next build`.
const Module = require('node:module');

const resolve = Module._resolveFilename;
const stub = require.resolve('server-only').replace(/index\.js$/, 'empty.js');
Module._resolveFilename = function (request, ...rest) {
  return request === 'server-only' ? stub : resolve.call(this, request, ...rest);
};
