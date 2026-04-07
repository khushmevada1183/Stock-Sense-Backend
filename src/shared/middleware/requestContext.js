const { randomUUID } = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';

const normalizeRequestId = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  const value = String(rawValue).trim();
  if (!value || value.length > 128) {
    return null;
  }

  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : null;
};

const readHeaderValue = (headerValue) => {
  if (Array.isArray(headerValue)) {
    return normalizeRequestId(headerValue[0]);
  }

  return normalizeRequestId(headerValue);
};

const requestContext = (req, res, next) => {
  const requestId =
    readHeaderValue(req.headers[REQUEST_ID_HEADER]) ||
    readHeaderValue(req.headers['x-correlation-id']) ||
    randomUUID();

  req.requestId = requestId;
  req.context = {
    requestId,
    startedAtMs: Date.now(),
  };

  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = {
  REQUEST_ID_HEADER,
  requestContext,
  requestContextMiddleware: requestContext,
};
