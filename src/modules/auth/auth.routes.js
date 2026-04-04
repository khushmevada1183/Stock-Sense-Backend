const express = require('express');
const {
  signup,
  login,
  oauthLogin,
  refresh,
  logout,
  logoutAll,
  getSessions,
  getAuditLogs,
  resendEmailVerification,
  verifyEmail,
  forgotPasswordController,
  resetPasswordController,
  getProfile,
  updateProfile,
} = require('./auth.controller');
const { requireAuth } = require('./auth.middleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/oauth/login', oauthLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.post('/resend-verification', resendEmailVerification);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);

router.get('/sessions', requireAuth, getSessions);
router.get('/audit-logs', requireAuth, getAuditLogs);
router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);
router.get('/me', requireAuth, getProfile);

module.exports = router;
