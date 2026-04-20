const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sendEmail,
  resolveEmailProvider,
  setResendClientFactoryForTests,
  resetResendClientFactoryForTests,
} = require('../src/services/email/email.service');

const withEnv = async (overrides, callback) => {
  const originalValues = {};

  for (const [key, value] of Object.entries(overrides)) {
    originalValues[key] = Object.prototype.hasOwnProperty.call(process.env, key)
      ? process.env[key]
      : undefined;

    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('resolveEmailProvider falls back to mock when no provider config exists', async () => {
  await withEnv(
    {
      EMAIL_PROVIDER: undefined,
      NOTIFICATION_EMAIL_PROVIDER: undefined,
      EMAIL_DELIVERY_MODE: undefined,
      NOTIFICATION_EMAIL_MODE: undefined,
      RESEND_API_KEY: undefined,
      EMAIL_WEBHOOK_URL: undefined,
      NOTIFICATION_EMAIL_WEBHOOK_URL: undefined,
    },
    async () => {
      assert.equal(resolveEmailProvider(), 'mock');
    }
  );
});

test('sendEmail returns simulated payload in mock mode', async () => {
  await withEnv(
    {
      EMAIL_PROVIDER: 'mock',
      EMAIL_DELIVERY_MODE: 'mock',
    },
    async () => {
      const result = await sendEmail({
        to: 'mock.user@example.com',
        subject: 'Mock Subject',
        text: 'Mock Body',
      });

      assert.equal(result.provider, 'mock');
      assert.equal(result.providerMessageId, null);
      assert.equal(result.providerResponse, 'email_mock_simulated');
    }
  );
});

test('sendEmail uses Resend SDK payload with camelCase fields', async () => {
  let capturedApiKey = null;
  let capturedRequest = null;

  setResendClientFactoryForTests((apiKey) => {
    capturedApiKey = apiKey;
    return {
      emails: {
        send: async (requestBody) => {
          capturedRequest = requestBody;
          return {
            data: { id: 'email_test_message_id' },
            error: null,
          };
        },
      },
    };
  });

  try {
    await withEnv(
      {
        EMAIL_PROVIDER: 'resend',
        EMAIL_DELIVERY_MODE: 'resend',
        RESEND_API_KEY: 're_test_key_123',
        EMAIL_FROM: 'Stock Sense <noreply@stocksense.example.com>',
        EMAIL_REPLY_TO: 'support@stocksense.example.com',
      },
      async () => {
        const result = await sendEmail({
          to: ['delivered@resend.dev', 'bounced@resend.dev'],
          subject: 'Resend Subject',
          html: '<strong>It works!</strong>',
          replyTo: 'help@stocksense.example.com',
          idempotencyKey: 'welcome-user/123456789',
          tags: [{ name: 'category', value: 'welcome' }],
        });

        assert.equal(result.provider, 'resend');
        assert.equal(result.providerMessageId, 'email_test_message_id');

        assert.equal(capturedApiKey, 're_test_key_123');
        assert.equal(capturedRequest.from, 'Stock Sense <noreply@stocksense.example.com>');
        assert.deepEqual(capturedRequest.to, ['delivered@resend.dev', 'bounced@resend.dev']);
        assert.equal(capturedRequest.replyTo, 'help@stocksense.example.com');
        assert.equal(capturedRequest.idempotencyKey, 'welcome-user/123456789');
        assert.deepEqual(capturedRequest.tags, [{ name: 'category', value: 'welcome' }]);
      }
    );
  } finally {
    resetResendClientFactoryForTests();
  }
});

test('sendEmail throws when template is combined with html or text', async () => {
  await withEnv(
    {
      EMAIL_PROVIDER: 'resend',
      EMAIL_DELIVERY_MODE: 'resend',
      RESEND_API_KEY: 're_test_key_123',
      EMAIL_FROM: 'Stock Sense <noreply@stocksense.example.com>',
    },
    async () => {
      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'delivered@resend.dev',
            subject: 'Template conflict',
            html: '<p>hello</p>',
            template: {
              id: 'tpl_123',
              variables: { name: 'Alex' },
            },
          });
        },
        (error) => /template cannot be combined/i.test(error.message)
      );
    }
  );
});

test('sendEmail surfaces SDK errors from resend.emails.send()', async () => {
  setResendClientFactoryForTests(() => {
    return {
      emails: {
        send: async () => {
          return {
            data: null,
            error: {
              message: 'Rate limit exceeded',
              name: 'rate_limit',
            },
          };
        },
      },
    };
  });

  try {
    await withEnv(
      {
        EMAIL_PROVIDER: 'resend',
        EMAIL_DELIVERY_MODE: 'resend',
        RESEND_API_KEY: 're_test_key_123',
        EMAIL_FROM: 'Stock Sense <noreply@stocksense.example.com>',
      },
      async () => {
        await assert.rejects(
          async () => {
            await sendEmail({
              to: 'delivered@resend.dev',
              subject: 'Rate limit',
              html: '<p>Hello</p>',
            });
          },
          (error) => /Rate limit exceeded/.test(error.message)
        );
      }
    );
  } finally {
    resetResendClientFactoryForTests();
  }
});

test('sendEmail throws when resend mode is enabled without credentials', async () => {
  await withEnv(
    {
      EMAIL_PROVIDER: 'resend',
      EMAIL_DELIVERY_MODE: 'resend',
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
    },
    async () => {
      await assert.rejects(
        async () => {
          await sendEmail({
            to: 'user@example.com',
            subject: 'Missing credentials',
            text: 'Body',
          });
        },
        (error) => {
          return /RESEND_API_KEY is not configured/.test(error.message);
        }
      );
    }
  );
});
