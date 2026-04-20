const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeVerifyResetCodePayload,
  normalizeResetPasswordPayload,
} = require('../src/modules/auth/auth.validation');

test('normalizeVerifyResetCodePayload enforces and normalizes reset code', () => {
  const payload = normalizeVerifyResetCodePayload({
    email: 'KhushMevada1183@gmail.com',
    resetCode: 'ab2c3d4e',
  });

  assert.deepEqual(payload, {
    email: 'khushmevada1183@gmail.com',
    resetCode: 'AB2C3D4E',
  });
});

test('normalizeResetPasswordPayload accepts resetToken + newPassword contract', () => {
  const payload = normalizeResetPasswordPayload({
    resetToken: 'test_reset_session_token_1234567890abcdefghijklmnopqrstuvwxyz',
    newPassword: 'NewSecurePass123!',
  });

  assert.equal(payload.resetToken, 'test_reset_session_token_1234567890abcdefghijklmnopqrstuvwxyz');
  assert.equal(payload.newPassword, 'NewSecurePass123!');
});

test('normalizeResetPasswordPayload rejects legacy email/resetCode payload', () => {
  assert.throws(
    () => {
      normalizeResetPasswordPayload({
        email: 'khushmevada1183@gmail.com',
        resetCode: 'AB2C3D4E',
        newPassword: 'NewSecurePass123!',
      });
    },
    (error) => /resetToken/.test(error.message)
  );
});
