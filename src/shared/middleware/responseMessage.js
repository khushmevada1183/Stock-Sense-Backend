const resolveDefaultMessage = (statusCode) => {
  if (statusCode >= 500) {
    return 'Something went wrong';
  }

  if (statusCode >= 400) {
    switch (statusCode) {
      case 400:
        return 'Invalid request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Resource not found';
      case 409:
        return 'Conflict';
      case 429:
        return 'Too many requests';
      default:
        return 'Request failed';
    }
  }

  switch (statusCode) {
    case 201:
      return 'Created successfully';
    case 202:
      return 'Request accepted';
    case 204:
      return 'Request successful';
    default:
      return 'Request successful';
  }
};

const pickMessage = (payload, statusCode) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return resolveDefaultMessage(statusCode);
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (
    payload.error &&
    typeof payload.error === 'object' &&
    !Array.isArray(payload.error) &&
    typeof payload.error.message === 'string' &&
    payload.error.message.trim()
  ) {
    return payload.error.message.trim();
  }

  if (
    payload.data &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data) &&
    typeof payload.data.message === 'string' &&
    payload.data.message.trim()
  ) {
    return payload.data.message.trim();
  }

  return resolveDefaultMessage(statusCode);
};

const attachResponseMessage = (req, res, next) => {
  if (res.locals.__responseMessageAttached) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.locals.__responseMessageAttached = true;

  res.json = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return originalJson(payload);
    }

    const message = pickMessage(payload, res.statusCode);
    const normalized = {
      ...payload,
      message,
    };

    if (
      normalized.error &&
      typeof normalized.error === 'object' &&
      !Array.isArray(normalized.error) &&
      (!normalized.error.message || !String(normalized.error.message).trim())
    ) {
      normalized.error = {
        ...normalized.error,
        message,
      };
    }

    return originalJson(normalized);
  };

  next();
};

module.exports = {
  attachResponseMessage,
  responseMessageMiddleware: attachResponseMessage,
};
