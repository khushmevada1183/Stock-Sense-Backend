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
      'Official API documentation for Stock Sense backend. Includes auth, portfolios, market snapshots, and stock ticks APIs.',
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
    { name: 'Stocks', description: 'Stock tick ingestion and reads' },
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
        summary: 'List portfolios for a user',
        parameters: [
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Temporary user scope for current non-auth portfolio routes',
          },
        ],
        responses: {
          200: successResponse,
        },
      },
      post: {
        tags: ['Portfolio'],
        summary: 'Create a portfolio',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'portfolioName'],
                properties: {
                  userId: { type: 'string' },
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
        },
      },
    },
    '/api/v1/portfolios/holdings': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get holdings summary for user or specific portfolio',
        parameters: [
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/summary': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get portfolio summary metrics',
        parameters: [
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'portfolioId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          400: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}': {
      get: {
        tags: ['Portfolio'],
        summary: 'Get full details for one portfolio',
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          404: errorResponse,
        },
      },
      put: {
        tags: ['Portfolio'],
        summary: 'Update portfolio fields or seed stocks',
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
                  userId: { type: 'string' },
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
          404: errorResponse,
        },
      },
      delete: {
        tags: ['Portfolio'],
        summary: 'Delete a portfolio',
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse,
          404: errorResponse,
        },
      },
    },
    '/api/v1/portfolios/{portfolioId}/transactions': {
      post: {
        tags: ['Portfolio'],
        summary: 'Append one transaction to a portfolio',
        parameters: [
          { name: 'portfolioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'symbol', 'transactionType', 'quantity', 'price', 'transactionDate'],
                properties: {
                  userId: { type: 'string' },
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
          404: errorResponse,
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
