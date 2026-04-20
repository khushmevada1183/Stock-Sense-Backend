const APP_NAME = 'Stock Sense';

const EMAIL_TEMPLATE_NAMES = Object.freeze({
  EMAIL_VERIFICATION_OTP: 'email_verification_otp',
  PASSWORD_RESET_CODE: 'password_reset_code',
  LOGIN_SECURITY_ALERT: 'login_security_alert',
  NOTIFICATION_ALERT: 'notification_alert',
});

const normalizeString = (value) => String(value || '').trim();

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const escapeText = (value) => normalizeString(value).replace(/\r?\n/g, ' ');

const resolveGreeting = (fullName) => {
  const normalized = normalizeString(fullName);
  return normalized ? `Hi ${normalized},` : 'Hi,';
};

const formatIsoTimestamp = (isoValue) => {
  const date = new Date(isoValue);
  if (!Number.isFinite(date.getTime())) {
    return 'Unknown time';
  }

  return date.toISOString();
};

const formatNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 'n/a';
  }

  return parsed.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
};

const buildDetailRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:20px 0 0;">',
    ...rows.map(({ label, value }) => {
      return [
        '<tr>',
        '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;vertical-align:top;width:38%;">',
        escapeHtml(label),
        '</td>',
        '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;vertical-align:top;font-weight:600;">',
        escapeHtml(value),
        '</td>',
        '</tr>',
      ].join('');
    }),
    '</table>',
  ].join('');
};

const buildCodeBlock = (code) => {
  return [
    '<div style="margin:24px 0 12px;padding:22px 18px;border-radius:18px;background:#0f172a;color:#f8fafc;text-align:center;letter-spacing:0.35em;font-size:30px;font-weight:700;font-family:Courier New, monospace;">',
    escapeHtml(code),
    '</div>',
  ].join('');
};

const buildEmailFrame = ({
  preheader,
  eyebrow,
  title,
  intro,
  sections = [],
  detailRows = [],
  footerNote,
}) => {
  const contentSections = [intro ? `<p style="margin:0 0 12px;color:#334155;font-size:16px;line-height:1.6;">${escapeHtml(intro)}</p>` : '', ...sections, buildDetailRows(detailRows)].filter(Boolean).join('');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">',
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
      : '',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:32px 16px;">',
    '<tr>',
    '<td align="center">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">',
    '<tr>',
    '<td style="padding:28px 28px 0;">',
    '<div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">',
    escapeHtml(APP_NAME),
    '</div>',
    eyebrow
      ? `<div style="margin-top:16px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>`
      : '',
    `<h1 style="margin:12px 0 0;color:#0f172a;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:20px 28px 28px;">',
    contentSections,
    footerNote
      ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footerNote)}</p>`
      : '',
    '</td>',
    '</tr>',
    '</table>',
    `<p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;max-width:640px;">You are receiving this email because you have a ${escapeHtml(APP_NAME)} account or enabled notifications for it.</p>`,
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
};

const buildEmailVerificationOtpTemplate = ({ fullName, verificationOtp, expiresInMinutes }) => {
  const greeting = resolveGreeting(fullName);
  const expiresLabel = Number.isFinite(expiresInMinutes) ? `${expiresInMinutes} minutes` : 'a short time';

  const subject = `Verify your ${APP_NAME} email`;
  const preheader = `Use ${verificationOtp} to finish verifying your ${APP_NAME} account.`;
  const text = [
    `${greeting}`,
    '',
    'Use this verification code to confirm your Stock Sense account:',
    `${verificationOtp}`,
    '',
    `This code expires in ${expiresLabel}.`,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = buildEmailFrame({
    preheader,
    eyebrow: 'Email verification',
    title: 'Confirm your account',
    intro: `${greeting} Use the verification code below to finish setting up your account.`,
    sections: [
      buildCodeBlock(verificationOtp),
      `<p style="margin:0;color:#334155;font-size:16px;line-height:1.6;">This code expires in <strong>${escapeHtml(expiresLabel)}</strong>.</p>`,
      '<p style="margin:12px 0 0;color:#64748b;font-size:14px;line-height:1.6;">If you did not request this, you can ignore this email.</p>',
    ],
    footerNote: 'If the code expires before you use it, request a new one from Stock Sense.',
  });

  return {
    name: EMAIL_TEMPLATE_NAMES.EMAIL_VERIFICATION_OTP,
    subject,
    text,
    html,
  };
};

const buildPasswordResetCodeTemplate = ({ fullName, resetCode, expiresInMinutes }) => {
  const greeting = resolveGreeting(fullName);
  const expiresLabel = Number.isFinite(expiresInMinutes) ? `${expiresInMinutes} minutes` : 'a short time';

  const subject = `Reset your ${APP_NAME} password`;
  const preheader = `Use ${resetCode} to reset your ${APP_NAME} password.`;
  const text = [
    `${greeting}`,
    '',
    'Use this code to reset your Stock Sense password:',
    `${resetCode}`,
    '',
    `This code expires in ${expiresLabel}.`,
    '',
    'If you did not request a password reset, please ignore this email.',
  ].join('\n');

  const html = buildEmailFrame({
    preheader,
    eyebrow: 'Password reset',
    title: 'Reset your password',
    intro: `${greeting} Use the code below to set a new password for your account.`,
    sections: [
      buildCodeBlock(resetCode),
      `<p style="margin:0;color:#334155;font-size:16px;line-height:1.6;">This code expires in <strong>${escapeHtml(expiresLabel)}</strong>.</p>`,
      '<p style="margin:12px 0 0;color:#64748b;font-size:14px;line-height:1.6;">If you did not request a password reset, please ignore this email.</p>',
    ],
    footerNote: 'After resetting your password, review your active sessions to make sure everything looks right.',
  });

  return {
    name: EMAIL_TEMPLATE_NAMES.PASSWORD_RESET_CODE,
    subject,
    text,
    html,
  };
};

const buildLoginSecurityAlertTemplate = ({ fullName, ipAddress, userAgent, occurredAt }) => {
  const greeting = resolveGreeting(fullName);
  const safeIpAddress = normalizeString(ipAddress) || 'Unknown IP';
  const safeUserAgent = normalizeString(userAgent) || 'Unknown device';
  const safeOccurredAt = formatIsoTimestamp(occurredAt);

  const subject = `New sign-in detected on your ${APP_NAME} account`;
  const preheader = `A new login was detected from ${safeIpAddress}.`;
  const text = [
    `${greeting}`,
    '',
    `A login from a new device was detected for your ${APP_NAME} account.`,
    `Time: ${safeOccurredAt}`,
    `IP address: ${safeIpAddress}`,
    `Device: ${safeUserAgent}`,
    '',
    'If this was not you, reset your password immediately and review active sessions.',
  ].join('\n');

  const html = buildEmailFrame({
    preheader,
    eyebrow: 'Security alert',
    title: 'New sign-in detected',
    intro: `${greeting} We noticed a login from a device we have not seen before.`,
    detailRows: [
      { label: 'Time', value: safeOccurredAt },
      { label: 'IP address', value: safeIpAddress },
      { label: 'Device', value: safeUserAgent },
    ],
    sections: [
      '<p style="margin:18px 0 0;color:#b91c1c;font-size:15px;font-weight:700;line-height:1.6;">If this was not you, reset your password immediately and review active sessions.</p>',
    ],
    footerNote: 'Security tip: use a unique password and keep email verification enabled on your account.',
  });

  return {
    name: EMAIL_TEMPLATE_NAMES.LOGIN_SECURITY_ALERT,
    subject,
    text,
    html,
  };
};

const buildNotificationAlertTemplate = ({ title, message, payload = {} }) => {
  const symbol = normalizeString(payload.symbol).toUpperCase();
  const reason = normalizeString(payload.reason || 'alert_triggered').replace(/_/g, ' ');
  const currentPrice = formatNumber(payload?.metrics?.currentPrice);
  const targetValue = formatNumber(payload?.targetValue);
  const evaluatedAt = formatIsoTimestamp(payload?.evaluatedAt || payload?.createdAt || new Date().toISOString());

  const subject = symbol ? `${APP_NAME} alert: ${symbol}` : `${APP_NAME} notification alert`;
  const preheader = message || `${symbol || 'Your stock'} alert triggered in Stock Sense.`;
  const text = [
    `Hello,`,
    '',
    title,
    '',
    message,
    '',
    `Symbol: ${symbol || 'n/a'}`,
    `Reason: ${reason || 'n/a'}`,
    `Current price: ${currentPrice}`,
    `Target value: ${targetValue}`,
    `Evaluated at: ${evaluatedAt}`,
    '',
    'Open Stock Sense to review the alert and adjust your settings if needed.',
  ].join('\n');

  const html = buildEmailFrame({
    preheader,
    eyebrow: 'Alert update',
    title,
    intro: message,
    detailRows: [
      { label: 'Symbol', value: symbol || 'n/a' },
      { label: 'Reason', value: reason || 'n/a' },
      { label: 'Current price', value: currentPrice },
      { label: 'Target value', value: targetValue },
      { label: 'Evaluated at', value: evaluatedAt },
    ],
    sections: [
      '<p style="margin:18px 0 0;color:#334155;font-size:15px;line-height:1.7;">Open Stock Sense to review the alert and update your watchlist or rules if needed.</p>',
    ],
    footerNote: 'You can update notification preferences from your Stock Sense settings page.',
  });

  return {
    name: EMAIL_TEMPLATE_NAMES.NOTIFICATION_ALERT,
    subject,
    text,
    html,
  };
};

module.exports = {
  EMAIL_TEMPLATE_NAMES,
  buildEmailVerificationOtpTemplate,
  buildPasswordResetCodeTemplate,
  buildLoginSecurityAlertTemplate,
  buildNotificationAlertTemplate,
};
