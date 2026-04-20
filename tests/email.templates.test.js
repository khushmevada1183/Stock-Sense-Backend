const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EMAIL_TEMPLATE_NAMES,
  buildEmailVerificationOtpTemplate,
  buildPasswordResetCodeTemplate,
  buildLoginSecurityAlertTemplate,
  buildNotificationAlertTemplate,
} = require('../src/services/email/email.templates');

test('email template names stay stable for the major outbound flows', () => {
  assert.equal(EMAIL_TEMPLATE_NAMES.EMAIL_VERIFICATION_OTP, 'email_verification_otp');
  assert.equal(EMAIL_TEMPLATE_NAMES.PASSWORD_RESET_CODE, 'password_reset_code');
  assert.equal(EMAIL_TEMPLATE_NAMES.LOGIN_SECURITY_ALERT, 'login_security_alert');
  assert.equal(EMAIL_TEMPLATE_NAMES.NOTIFICATION_ALERT, 'notification_alert');
});

test('verification OTP template includes a branded code email', () => {
  const template = buildEmailVerificationOtpTemplate({
    fullName: 'Khush Mevada',
    verificationOtp: '123456',
    expiresInMinutes: 10,
  });

  assert.equal(template.name, EMAIL_TEMPLATE_NAMES.EMAIL_VERIFICATION_OTP);
  assert.match(template.subject, /Verify your Stock Sense email/);
  assert.match(template.text, /123456/);
  assert.match(template.html, /Confirm your account/);
});

test('password reset template is branded and code-focused', () => {
  const template = buildPasswordResetCodeTemplate({
    fullName: 'Khush Mevada',
    resetCode: 'A1B2C3D4',
    expiresInMinutes: 30,
  });

  assert.equal(template.name, EMAIL_TEMPLATE_NAMES.PASSWORD_RESET_CODE);
  assert.match(template.subject, /Reset your Stock Sense password/);
  assert.match(template.text, /A1B2C3D4/);
  assert.match(template.html, /Reset your password/);
});

test('login security alert template captures device details', () => {
  const template = buildLoginSecurityAlertTemplate({
    fullName: 'Khush Mevada',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    occurredAt: '2026-04-20T10:00:00.000Z',
  });

  assert.equal(template.name, EMAIL_TEMPLATE_NAMES.LOGIN_SECURITY_ALERT);
  assert.match(template.subject, /New sign-in detected/);
  assert.match(template.text, /127.0.0.1/);
  assert.match(template.html, /Security alert/);
});

test('notification alert template summarizes stock alert details', () => {
  const template = buildNotificationAlertTemplate({
    title: 'RELIANCE alert triggered',
    message: 'RELIANCE price crossed target.',
    payload: {
      symbol: 'RELIANCE',
      reason: 'price_above_target',
      metrics: { currentPrice: 1234.56 },
      targetValue: 1200,
      evaluatedAt: '2026-04-20T10:00:00.000Z',
    },
  });

  assert.equal(template.name, EMAIL_TEMPLATE_NAMES.NOTIFICATION_ALERT);
  assert.match(template.subject, /RELIANCE/);
  assert.match(template.text, /Current price: 1,234.56/);
  assert.match(template.html, /Target value/);
});