const { buildSuccessResponse } = require('../utils/responseBuilder');

const attachResponseHelpers = (req, res, next) => {
  if (typeof res.success !== 'function') {
    res.success = (data = null, options = {}) => {
      const statusCode = Number.isInteger(options.statusCode) ? options.statusCode : 200;

      return res.status(statusCode).json(
        buildSuccessResponse(data, {
          req,
          meta: options.meta,
          pagination: options.pagination,
        })
      );
    };
  }

  if (typeof res.created !== 'function') {
    res.created = (data = null, options = {}) => {
      return res.success(data, {
        ...options,
        statusCode: 201,
      });
    };
  }

  next();
};

module.exports = {
  attachResponseHelpers,
  responseHelpersMiddleware: attachResponseHelpers,
};
