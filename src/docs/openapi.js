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
      'Official API documentation for Stock Sense backend. Includes auth, portfolios, watchlists, alerts, notifications, IPO and institutional flow APIs, news/sentiment intelligence APIs, market snapshots, stock tick ingestion, and Timescale candle history APIs.',
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
    { name: 'Institutional', description: 'FII/DII flows, block deals, mutual-fund holdings, insider trades, shareholding patterns, corporate actions, earnings calendar, and institutional data aggregates' },
    { name: 'Stocks', description: 'Stock tick ingestion and candle history reads' },
    { name: 'News', description: 'News feed, sentiment scoring, and fear-greed intelligence' },
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
    '/api/v1/portfolios/performance': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get portfolio performance chart series (aggregate or one portfolio)',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'maxPoints',
            in: 'query',
            schema: { type: 'integer', minimum: 10, maximum: 1000, default: 180 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/xirr': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get annualized XIRR for aggregate or one portfolio',
        security: bearerAuth,
        parameters: [
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
          { name: 'asOf', in: 'query', schema: { type: 'string', format: 'date' } },
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
    '/api/v1/portfolios/{portfolioId}/performance': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get performance chart series for one portfolio',
        security: bearerAuth,
        parameters: [
          {
            name: 'portfolioId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'maxPoints',
            in: 'query',
            schema: { type: 'integer', minimum: 10, maximum: 1000, default: 180 },
          },
        ],
        responses: {
          200: successResponse,
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}/xirr': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get annualized XIRR for one portfolio',
        security: bearerAuth,
        parameters: [
          {
            name: 'portfolioId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'asOf', in: 'query', schema: { type: 'string', format: 'date' } },
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
    '/api/v1/institutional/block-deals': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest available day of block or bulk deals',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'exchange',
            in: 'query',
            schema: { type: 'string', enum: ['NSE', 'BSE'] },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'dealType',
            in: 'query',
            schema: { type: 'string', enum: ['block', 'bulk'] },
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
    '/api/v1/institutional/block-deals/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical block or bulk deals with date range filters',
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
            name: 'exchange',
            in: 'query',
            schema: { type: 'string', enum: ['NSE', 'BSE'] },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'dealType',
            in: 'query',
            schema: { type: 'string', enum: ['block', 'bulk'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 250 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/block-deals/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one block-deals scraper sync run',
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
            name: 'exchange',
            in: 'query',
            schema: { type: 'string', enum: ['NSE', 'BSE'] },
          },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 365, default: 7 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 200 },
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
    '/api/v1/institutional/mutual-funds': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest monthly mutual-fund holdings rows',
        parameters: [
          {
            name: 'month',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'amc',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'scheme',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/mutual-funds/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical monthly mutual-fund holdings rows',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'amc',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'scheme',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 2000, default: 300 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/mutual-funds/top-holders': {
      get: {
        tags: ['Institutional'],
        summary: 'Get top mutual-fund holders by market value for latest or selected month',
        parameters: [
          {
            name: 'month',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/mutual-funds/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one mutual-fund holdings scraper sync run',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'months',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 60, default: 6 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 300 },
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
    '/api/v1/institutional/insider-trades': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest-day insider trading rows',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'transactionType',
            in: 'query',
            schema: { type: 'string', enum: ['buy', 'sell'] },
          },
          {
            name: 'insider',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/insider-trades/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical insider trading rows',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'transactionType',
            in: 'query',
            schema: { type: 'string', enum: ['buy', 'sell'] },
          },
          {
            name: 'insider',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 3000, default: 300 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/insider-trades/summary': {
      get: {
        tags: ['Institutional'],
        summary: 'Get monthly or yearly insider trading value summary',
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'transactionType',
            in: 'query',
            schema: { type: 'string', enum: ['buy', 'sell'] },
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
    '/api/v1/institutional/insider-trades/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one insider-trades scraper sync run',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'transactionType',
            in: 'query',
            schema: { type: 'string', enum: ['buy', 'sell'] },
          },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 300 },
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
    '/api/v1/institutional/shareholding': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest-quarter shareholding pattern rows',
        parameters: [
          {
            name: 'period',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/shareholding/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical quarterly shareholding pattern rows',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 3000, default: 300 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/shareholding/trends': {
      get: {
        tags: ['Institutional'],
        summary: 'Get quarterly or yearly shareholding trend aggregates',
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['quarterly', 'yearly'], default: 'quarterly' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
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
    '/api/v1/institutional/shareholding/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one quarterly shareholding scraper sync run',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'quarters',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 80, default: 8 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 400 },
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
    '/api/v1/institutional/corporate-actions': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest-day corporate actions rows',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'actionType',
            in: 'query',
            schema: { type: 'string', enum: ['dividend', 'split', 'bonus', 'rights', 'buyback'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/corporate-actions/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical corporate actions rows',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'actionType',
            in: 'query',
            schema: { type: 'string', enum: ['dividend', 'split', 'bonus', 'rights', 'buyback'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 3000, default: 300 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/corporate-actions/summary': {
      get: {
        tags: ['Institutional'],
        summary: 'Get monthly or yearly corporate actions summary',
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'actionType',
            in: 'query',
            schema: { type: 'string', enum: ['dividend', 'split', 'bonus', 'rights', 'buyback'] },
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
    '/api/v1/institutional/corporate-actions/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one corporate-actions scraper sync run',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'actionType',
            in: 'query',
            schema: { type: 'string', enum: ['dividend', 'split', 'bonus', 'rights', 'buyback'] },
          },
          {
            name: 'months',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 120, default: 24 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 300 },
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
    '/api/v1/institutional/earnings-calendar': {
      get: {
        tags: ['Institutional'],
        summary: 'Get latest-day earnings calendar rows',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'fiscalQuarter',
            in: 'query',
            schema: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/earnings-calendar/history': {
      get: {
        tags: ['Institutional'],
        summary: 'Get historical earnings calendar rows',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'fiscalQuarter',
            in: 'query',
            schema: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 3000, default: 300 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/institutional/earnings-calendar/summary': {
      get: {
        tags: ['Institutional'],
        summary: 'Get monthly or yearly earnings calendar summary',
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' },
          },
          {
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'fiscalQuarter',
            in: 'query',
            schema: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
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
    '/api/v1/institutional/earnings-calendar/sync': {
      post: {
        tags: ['Institutional'],
        summary: 'Trigger one earnings-calendar seeding run',
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
            name: 'symbol',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'fiscalQuarter',
            in: 'query',
            schema: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
          },
          {
            name: 'quarters',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 80, default: 8 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 320 },
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

    '/api/v1/stocks/search': {
      get: {
        tags: ['Stocks'],
        summary: 'Search stocks by symbol or company name',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search keyword for symbol/name',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/technical/status': {
      get: {
        tags: ['Stocks'],
        summary: 'Get technical-indicator scheduler runtime status',
        responses: {
          200: successResponse,
        },
      },
    },

    '/api/v1/stocks/technical/recompute': {
      post: {
        tags: ['Stocks'],
        summary: 'Trigger manual technical-indicator recomputation batch',
        parameters: [
          {
            name: 'symbols',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional comma-separated symbol override list',
          },
          {
            name: 'buckets',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional comma-separated bucket list from 1m,5m,15m,1d',
          },
          {
            name: 'maxSymbols',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 50 },
          },
          {
            name: 'lookbackLimit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 2000, default: 320 },
          },
          {
            name: 'ignoreMarketHours',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'If true, run even outside configured market window',
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/technical': {
      get: {
        tags: ['Stocks'],
        summary: 'Get precomputed technical indicators for a symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'bucket',
            in: 'query',
            schema: { type: 'string', enum: ['1m', '5m', '15m', '1d'], default: '1d' },
            description: 'Indicator timeframe bucket',
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 2000, default: 240 },
          },
          {
            name: 'includeHistory',
            in: 'query',
            schema: { type: 'boolean', default: true },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'If true, recomputes indicators from candles before reading',
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/fundamentals/status': {
      get: {
        tags: ['Stocks'],
        summary: 'Get fundamentals sync scheduler runtime status',
        responses: {
          200: successResponse,
        },
      },
    },

    '/api/v1/stocks/fundamentals/sync': {
      post: {
        tags: ['Stocks'],
        summary: 'Trigger manual fundamentals and financial statements sync',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  symbols: {
                    oneOf: [
                      { type: 'string', description: 'Comma-separated symbol list' },
                      {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    ],
                  },
                  statementTypes: {
                    oneOf: [
                      {
                        type: 'string',
                        description: 'Comma-separated list from cashflow,yoy_results,quarter_results,balancesheet',
                      },
                      {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: ['cashflow', 'yoy_results', 'quarter_results', 'balancesheet'],
                        },
                      },
                    ],
                  },
                  includeFundamentals: { type: 'boolean', default: true },
                  maxSymbols: { type: 'integer', minimum: 1, maximum: 200, default: 40 },
                  mode: {
                    type: 'string',
                    enum: ['scheduler', 'direct'],
                    description: 'Use scheduler mode to apply in-flight protection and scheduler defaults',
                  },
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

    '/api/v1/stocks/{symbol}/fundamental': {
      get: {
        tags: ['Stocks'],
        summary: 'Get computed valuation and profitability ratios for a symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'includeHistory',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'If true, fetches fresh upstream data before reading',
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/financials': {
      get: {
        tags: ['Stocks'],
        summary: 'Get stored financial statements for a symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'statementType',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['cashflow', 'yoy_results', 'quarter_results', 'balancesheet'],
              default: 'quarter_results',
            },
          },
          {
            name: 'includeHistory',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'If true, fetches fresh upstream data before reading',
          },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/peers': {
      get: {
        tags: ['Stocks'],
        summary: 'Get peer companies in the same sector sorted by market cap',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 12 },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'If true, refreshes sector taxonomy from upstream before peer lookup',
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}': {
      get: {
        tags: ['Stocks'],
        summary: 'Get stock profile/details by symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },

    '/api/v1/stocks/{symbol}/quote': {
      get: {
        tags: ['Stocks'],
        summary: 'Get latest stock quote by symbol',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
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
    '/api/v1/market/overview': {
      get: {
        tags: ['Market'],
        summary: 'Get market overview with indices, breadth, gainers/losers, and most active lists',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/indices/{name}': {
      get: {
        tags: ['Market'],
        summary: 'Get OHLCV history for a market index',
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'period',
            in: 'query',
            schema: { type: 'string', enum: ['1m', '6m', '1yr', '3yr', '5yr', '10yr', 'max'], default: '1m' },
          },
          {
            name: 'filter',
            in: 'query',
            schema: { type: 'string', enum: ['default', 'price', 'pe', 'sm', 'evebitda', 'ptb', 'mcs'], default: 'default' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 120 },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/market/sector-heatmap': {
      get: {
        tags: ['Market'],
        summary: 'Get aggregated sector heatmap from sector taxonomy and market shockers',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 25 },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/market/52-week-high': {
      get: {
        tags: ['Market'],
        summary: 'Get stocks nearest to 52-week highs from tracked dataset',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 25 },
          },
          {
            name: 'sector',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/market/52-week-low': {
      get: {
        tags: ['Market'],
        summary: 'Get stocks nearest to 52-week lows from tracked dataset',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 25 },
          },
          {
            name: 'sector',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
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
    '/api/v1/market/socket/status': {
      get: {
        tags: ['Market'],
        summary: 'Get websocket server runtime status',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/ticks/status': {
      get: {
        tags: ['Market'],
        summary: 'Get live tick stream scheduler and subscription status',
        responses: {
          200: successResponse,
        },
      },
    },
    '/api/v1/market/ticks/sync': {
      post: {
        tags: ['Market'],
        summary: 'Trigger one live tick stream cycle for subscribed/default symbols',
        parameters: [
          {
            name: 'symbols',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional comma-separated symbol override list',
          },
          {
            name: 'persist',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Whether to persist generated ticks into stock_price_ticks',
          },
          {
            name: 'includeDefaultSymbols',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Include configured default symbols when no explicit symbol list is provided',
          },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
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
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1440 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news': {
      get: {
        tags: ['News'],
        summary: 'Get paginated news feed with filtering and text search',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          {
            name: 'sentiment',
            in: 'query',
            schema: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          },
          { name: 'symbol', in: 'query', schema: { type: 'string' } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/category/{category}': {
      get: {
        tags: ['News'],
        summary: 'Get paginated news feed for a specific category',
        parameters: [
          {
            name: 'category',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['companies', 'markets', 'economy', 'ipos', 'commodities', 'global', 'regulatory', 'general'],
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/trending': {
      get: {
        tags: ['News'],
        summary: 'Get impact-ranked trending news',
        parameters: [
          { name: 'hours', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 336, default: 24 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'symbol', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/alerts': {
      get: {
        tags: ['News'],
        summary: 'Get high-confidence sentiment alerts from recent news',
        parameters: [
          { name: 'hours', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 168, default: 12 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'minConfidence', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1, default: 0.65 } },
          { name: 'minScore', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1, default: 0.4 } },
          { name: 'symbol', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/sync': {
      post: {
        tags: ['News'],
        summary: 'Trigger news ingestion and sentiment/social/fear-greed refresh',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 30, default: 2 } },
          { name: 'limitPerSource', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 300, default: 50 } },
          { name: 'includeNewsApi', in: 'query', schema: { type: 'boolean', default: true } },
          { name: 'includeRss', in: 'query', schema: { type: 'boolean', default: true } },
          { name: 'includeSocial', in: 'query', schema: { type: 'boolean', default: true } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/sentiment/sync': {
      post: {
        tags: ['News'],
        summary: 'Trigger batch sentiment recomputation for recent news',
        parameters: [
          { name: 'hours', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 720, default: 72 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5000, default: 1000 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/news/fear-greed': {
      get: {
        tags: ['News'],
        summary: 'Get fear-greed history and latest snapshot',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/stocks/{symbol}/sentiment': {
      get: {
        tags: ['News'],
        summary: 'Get stock-level sentiment summary, history, and social snapshots',
        parameters: [
          { name: 'symbol', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365, default: 14 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 } },
          {
            name: 'platform',
            in: 'query',
            schema: { type: 'string', enum: ['twitter', 'reddit', 'news', 'aggregate'] },
          },
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
          meta: {
            type: 'object',
            nullable: true,
            properties: {
              requestId: { type: 'string', nullable: true },
              timestamp: { type: 'string', format: 'date-time' },
              pagination: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
              },
            },
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
