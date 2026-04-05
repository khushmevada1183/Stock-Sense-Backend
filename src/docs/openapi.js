const baseServerUrl =
  process.env.EXTERNAL_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 10000}`;

const successResponse = {
  description: 'Successful response',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/SuccessResponse',
      },
    },
  },
};

const createdResponse = {
  description: 'Resource created',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/SuccessResponse',
      },
    },
  },
};

const errorResponse = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/ErrorResponse',
      },
    },
  },
};

const bearerAuth = [{ bearerAuth: [] }];

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Stock Sense Backend API',
    version: '1.0.0',
    description:
      'Official API documentation for Stock Sense backend. Includes auth, portfolios, watchlists, alerts, notifications, IPO and institutional flow APIs, market snapshots, stock tick ingestion, and Timescale candle history APIs.',
  },
  servers: [
    {
      url: baseServerUrl,
      description: 'Current backend server',
    },
  ],
  tags: [
    { name: 'System', description: 'Service and health endpoints' },
    { name: 'Auth', description: 'Authentication and account endpoints' },
    { name: 'Portfolio', description: 'Portfolio and holdings management' },
    { name: 'Watchlists', description: 'Watchlist CRUD and item ordering' },
    { name: 'Alerts', description: 'Price alert CRUD and filtering' },
    { name: 'Notifications', description: 'Notification delivery history and push device management' },
    { name: 'IPO', description: 'IPO calendar APIs and seeded issue data' },
    { name: 'Institutional', description: 'FII/DII flow scraper and historical aggregates' },
    { name: 'Stocks', description: 'Stock tick ingestion and candle history reads' },
    { name: 'Market', description: 'Market snapshot ingestion and reads' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Basic backend health check',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['System'],
        summary: 'Service health endpoint',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/health/db': {
      get: {
        tags: ['System'],
        summary: 'Database health endpoint',
        responses: {
          200: successResponse,
        },
      },
    },

    '/api/v1/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                  phone: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          401: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/v1/auth/oauth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with OAuth provider token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider'],
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['google', 'facebook'],
                  },
                  idToken: { type: 'string' },
                  accessToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          503: errorResponse,
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue a new token pair',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout by revoking the provided refresh token',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke all active sessions for current user',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Regenerate email verification OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email with OTP code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'verificationOtp'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  verificationOtp: { type: 'string', pattern: '^\\d{6}$' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Generate password reset token flow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated profile',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update current authenticated profile',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string', nullable: true },
                  avatarUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Alias of profile endpoint',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'List active sessions for current user',
        security: bearerAuth,
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/auth/audit-logs': {
      get: {
        tags: ['Auth'],
        summary: 'List auth audit logs for current user',
        security: bearerAuth,
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },

    '/api/v1/portfolios': {
      get: {
        tags: ['Portfolio'],
        summary: 'List portfolios for current authenticated user',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
      post: {
        tags: ['Portfolio'],
        summary: 'Create a portfolio',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['portfolioName'],
                properties: {
                  portfolioName: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  stocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['symbol', 'quantity', 'buyPrice', 'buyDate'],
                      properties: {
                        symbol: { type: 'string' },
                        quantity: { type: 'number' },
                        buyPrice: { type: 'number' },
                        buyDate: { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/holdings': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get holdings summary for current user or one portfolio',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/export': {
      get: {
        tags: ['Portfolio'],
        summary: 'Export holdings and summary as CSV',
        security: bearerAuth,
        parameters: [
          {
            name: 'portfolioId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional portfolio id. Omit to export aggregate holdings for all portfolios.',
          },
        ],
        responses: {
          200: {
            description: 'CSV export generated',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/summary': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get portfolio summary metrics for current user',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get full details for one portfolio',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
      put: {
        tags: ['Portfolio'],
        summary: 'Update portfolio fields or seed stocks',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  portfolioName: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  stocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        symbol: { type: 'string' },
                        quantity: { type: 'number' },
                        buyPrice: { type: 'number' },
                        buyDate: { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ['Portfolio'],
        summary: 'Delete a portfolio',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}/transactions': {
      post: {
        tags: ['Portfolio'],
        summary: 'Append one transaction to a portfolio',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['symbol', 'transactionType', 'quantity', 'price', 'transactionDate'],
                properties: {
                  symbol: { type: 'string' },
                  transactionType: { type: 'string', enum: ['buy', 'sell'] },
                  quantity: { type: 'number' },
                  price: { type: 'number' },
                  transactionDate: { type: 'string', format: 'date' },
                  fees: { type: 'number' },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}/holdings': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get holdings for one portfolio by id',
        security: bearerAuth,
        parameters: [
          {
            name: 'portfolioId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}/summary': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get summary metrics for one portfolio by id',
        security: bearerAuth,
        parameters: [
          {
            name: 'portfolioId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    '/api/v1/watchlists': {
      get: {
        tags: ['Watchlists'],
        summary: 'List watchlists for current authenticated user',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
      post: {
        tags: ['Watchlists'],
        summary: 'Create a watchlist',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
          409: errorResponse,
        },
      },
    },
    '/api/v1/watchlists/{watchlistId}': {
      get: {
        tags: ['Watchlists'],
        summary: 'Get one watchlist with ordered items',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
      patch: {
        tags: ['Watchlists'],
        summary: 'Update watchlist metadata',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          409: errorResponse,
        },
      },
      delete: {
        tags: ['Watchlists'],
        summary: 'Delete a watchlist',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/watchlists/{watchlistId}/items': {
      post: {
        tags: ['Watchlists'],
        summary: 'Add one symbol to a watchlist',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['symbol'],
                properties: {
                  symbol: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          409: errorResponse,
        },
      },
    },
    '/api/v1/watchlists/{watchlistId}/items/{itemId}': {
      delete: {
        tags: ['Watchlists'],
        summary: 'Remove one symbol from a watchlist',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/watchlists/{watchlistId}/items/reorder': {
      patch: {
        tags: ['Watchlists'],
        summary: 'Reorder watchlist items by itemIds',
        security: bearerAuth,
        parameters: [
          {
            name: 'watchlistId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itemIds'],
                properties: {
                  itemIds: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    '/api/v1/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'List price alerts for current authenticated user',
        security: bearerAuth,
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'isActive',
            in: 'query',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
      post: {
        tags: ['Alerts'],
        summary: 'Create a price alert',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['symbol', 'alertType', 'targetValue'],
                properties: {
                  symbol: { type: 'string' },
                  alertType: {
                    type: 'string',
                    enum: [
                      'price_above',
                      'price_below',
                      'percent_change_up',
                      'percent_change_down',
                      'volume_spike',
                      'daily_change',
                    ],
                  },
                  targetValue: { type: 'number' },
                  isActive: { type: 'boolean' },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/alerts/evaluator/status': {
      get: {
        tags: ['Alerts'],
        summary: 'Get alert evaluator scheduler runtime status',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/alerts/{alertId}': {
      get: {
        tags: ['Alerts'],
        summary: 'Get one price alert by id',
        security: bearerAuth,
        parameters: [
          {
            name: 'alertId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
      patch: {
        tags: ['Alerts'],
        summary: 'Update a price alert',
        security: bearerAuth,
        parameters: [
          {
            name: 'alertId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  alertType: {
                    type: 'string',
                    enum: [
                      'price_above',
                      'price_below',
                      'percent_change_up',
                      'percent_change_down',
                      'volume_spike',
                      'daily_change',
                    ],
                  },
                  targetValue: { type: 'number' },
                  isActive: { type: 'boolean' },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
      delete: {
        tags: ['Alerts'],
        summary: 'Delete a price alert',
        security: bearerAuth,
        parameters: [
          {
            name: 'alertId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notification delivery history for current authenticated user',
        security: bearerAuth,
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['queued', 'processing', 'sent', 'failed'] },
          },
          {
            name: 'channel',
            in: 'query',
            schema: { type: 'string', enum: ['email', 'push'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200 },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/notifications/delivery/status': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification delivery scheduler runtime status',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/notifications/push-devices': {
      get: {
        tags: ['Notifications'],
        summary: 'List registered push devices for current authenticated user',
        security: bearerAuth,
        responses: {
          200: successResponse,
          401: errorResponse,
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Register or re-activate a push device token',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceToken'],
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['fcm', 'expo', 'apns', 'webpush', 'mock'],
                  },
                  platform: {
                    type: 'string',
                    enum: ['ios', 'android', 'web', 'unknown'],
                  },
                  deviceToken: { type: 'string' },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/notifications/push-devices/{deviceId}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Deactivate one registered push device',
        security: bearerAuth,
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },

    '/api/v1/ipo/calendar': {
      get: {
        tags: ['IPO'],
        summary: 'Get IPO calendar entries (grouped or flat)',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['upcoming', 'active', 'listed', 'closed'] },
          },
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'grouped',
            in: 'query',
            schema: { type: 'boolean', default: true },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/ipo/subscriptions/latest': {
      get: {
        tags: ['IPO'],
        summary: 'Get latest IPO subscription snapshot per IPO',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['upcoming', 'active', 'listed', 'closed'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/ipo/subscriptions/sync': {
      post: {
        tags: ['IPO'],
        summary: 'Trigger IPO subscription scraper sync run',
        parameters: [
          {
            name: 'snapshotDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 500 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
        },
      },
    },
    '/api/v1/ipo/{ipoId}/subscription': {
      get: {
        tags: ['IPO'],
        summary: 'Get latest and historical subscription snapshots for one IPO',
        parameters: [
          {
            name: 'ipoId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 30 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/ipo/gmp/latest': {
      get: {
        tags: ['IPO'],
        summary: 'Get latest GMP snapshot per IPO',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['upcoming', 'active', 'listed', 'closed'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/ipo/gmp/sync': {
      post: {
        tags: ['IPO'],
        summary: 'Trigger IPO GMP scraper sync run',
        parameters: [
          {
            name: 'snapshotDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 500 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
        },
      },
    },
    '/api/v1/ipo/{ipoId}/gmp': {
      get: {
        tags: ['IPO'],
        summary: 'Get latest and historical GMP snapshots for one IPO',
        parameters: [
          {
            name: 'ipoId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 30 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/ipo/{ipoId}': {
      get: {
        tags: ['IPO'],
        summary: 'Get one IPO entry by id',
        parameters: [
          {
            name: 'ipoId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          404: errorResponse,
        },
      },
    },

    '/api/v1/institutional/fii-dii': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest daily FII/DII flow summary',
        parameters: [
          {
            name: 'segment',
            in: 'query',
            schema: { type: 'string', enum: ['equity', 'debt', 'hybrid'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 30 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/fii-dii/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical FII/DII activity rows',
        parameters: [
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'segment',
            in: 'query',
            schema: { type: 'string', enum: ['equity', 'debt', 'hybrid'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 120 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/fii-dii/cumulative': {
      get: {
        tags: ['Institutional'],
        summary: 'Get monthly or yearly cumulative FII/DII net flows',
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' },
          },
          {
            name: 'segment',
            in: 'query',
            schema: { type: 'string', enum: ['equity', 'debt', 'hybrid'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 120, default: 12 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/fii-dii/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one FII/DII scraper sync run',
        parameters: [
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'segment',
            in: 'query',
            schema: { type: 'string', enum: ['equity', 'debt', 'hybrid'] },
          },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/ticks': {
      get: {
        tags: ['Stocks'],
        summary: 'List stored ticks for a symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
      post: {
        tags: ['Stocks'],
        summary: 'Ingest or upsert tick data for a symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'array',
                    items: { $ref: '#/components/schemas/TickPayload' },
                  },
                  {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      ticks: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/TickPayload' },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: createdResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/history': {
      get: {
        tags: ['Stocks'],
        summary: 'Get OHLCV candle history for a symbol from Timescale aggregates',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'bucket',
            in: 'query',
            schema: { type: 'string', enum: ['1m', '5m', '15m', '1d'], default: '1d' },
            description: 'Candle timeframe bucket',
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/market/snapshot/sync': {
      post: {
        tags: ['Market'],
        summary: 'Trigger immediate market snapshot sync',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/snapshot/status': {
      get: {
        tags: ['Market'],
        summary: 'Get scheduler and freshness status for market snapshots',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/snapshot/latest': {
      get: {
        tags: ['Market'],
        summary: 'Get latest persisted market snapshot',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/snapshot/history': {
      get: {
        tags: ['Market'],
        summary: 'Get historical market snapshots',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1440 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        required: ['success'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            required: ['message', 'code'],
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string', format: 'date-time' },
              details: {
                oneOf: [
                  { type: 'object', additionalProperties: true },
                  { type: 'array', items: { type: 'object', additionalProperties: true } },
                  { type: 'string' },
                  { type: 'null' },
                ],
              },
            },
          },
        },
      },
      TickPayload: {
        type: 'object',
        required: ['timestamp', 'close'],
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          open: { type: 'number', nullable: true },
          high: { type: 'number', nullable: true },
          low: { type: 'number', nullable: true },
          close: { type: 'number' },
          volume: { type: 'integer', minimum: 0, nullable: true },
          source: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
};

module.exports = {
  openApiSpec,
};
