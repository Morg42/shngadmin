// Dev-only proxy configuration — NOT used in production builds.
//
// "secure": false — skips TLS certificate verification when the target uses
//   HTTPS with a self-signed cert (common on local SHNG installs).  Never
//   disable this in a production-facing reverse proxy.
//
// "logLevel": "debug" — logs every proxied request and response, including
//   headers (Authorization: Bearer …).  Drop to "info" or "warn" if the
//   terminal output becomes too noisy, or before sharing a console recording.

const PROXY_TARGET = 'http://localhost:8383';

const PROXY_DEFAULTS = {
  target: PROXY_TARGET,
  // Accept self-signed TLS certs on the local SHNG backend.
  secure: false,
  // Full request/response logging — includes auth headers; dev only.
  logLevel: 'debug',
};

module.exports = {
  '/api/**': { ...PROXY_DEFAULTS },
  '/admin/**': { ...PROXY_DEFAULTS },
  '/plugin/**': { ...PROXY_DEFAULTS },
};
