const hasKeys = (value) => {
  return Boolean(value) && typeof value === 'object' && Object.keys(value).length > 0;
};

const buildResponseMeta = ({ req, requestId = null, meta = {}, pagination = null } = {}) => {
  const resolvedRequestId =
    requestId ||
    req?.requestId ||
    req?.context?.requestId ||
    null;

  const responseMeta = {
    timestamp: new Date().toISOString(),
    ...(resolvedRequestId ? { requestId: resolvedRequestId } : {}),
    ...(pagination ? { pagination } : {}),
    ...(hasKeys(meta) ? meta : {}),
  };

  return responseMeta;
};

const buildSuccessResponse = (dataOrOptions = null, options = {}) => {
  let data = dataOrOptions;
  let buildOptions = options || {};

  // Backward compatibility with legacy signature:
  // buildSuccessResponse({ data, metadata, requestId })
  if (
    dataOrOptions &&
    typeof dataOrOptions === 'object' &&
    !Array.isArray(dataOrOptions) &&
    (Object.prototype.hasOwnProperty.call(dataOrOptions, 'data') ||
      Object.prototype.hasOwnProperty.call(dataOrOptions, 'metadata') ||
      Object.prototype.hasOwnProperty.call(dataOrOptions, 'requestId')) &&
    Object.keys(buildOptions).length === 0
  ) {
    data = dataOrOptions.data === undefined ? null : dataOrOptions.data;
    buildOptions = {
      requestId: dataOrOptions.requestId || null,
      meta: dataOrOptions.metadata || null,
    };
  }

  const resolvedMessage =
    data && typeof data === 'object' && !Array.isArray(data) && typeof data.message === 'string' && data.message.trim()
      ? data.message.trim()
      : 'Request successful';

  const payload = {
    success: true,
    message: resolvedMessage,
    data: data === undefined ? null : data,
  };

  const metadata = buildResponseMeta(buildOptions);
  if (hasKeys(metadata)) {
    payload.meta = metadata;
  }

  return payload;
};

const sendSuccess = (res, { statusCode = 200, data = null, metadata = null } = {}) => {
  const payload = buildSuccessResponse(data, {
    requestId: res.locals?.requestId || null,
    meta: metadata,
  });

  return res.status(statusCode).json(payload);
};

module.exports = {
  buildSuccessResponse,
  buildResponseMeta,
  sendSuccess,
};
