const { Resend } = require('resend');
const { ApiError } = require('../../utils/errorHandler');

const SUPPORTED_EMAIL_PROVIDERS = new Set(['mock', 'webhook', 'resend']);

let resendClientFactory = (apiKey) => new Resend(apiKey);
let cachedResendClient = null;
let cachedResendApiKey = null;

const normalizeString = (value) => {
  return String(value || '').trim();
};

const normalizeProvider = (provider) => {
  const normalized = normalizeString(provider).toLowerCase();
  return SUPPORTED_EMAIL_PROVIDERS.has(normalized) ? normalized : null;
};

const normalizeAddressList = (value) => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((item) => normalizeString(item)).filter(Boolean))];
};

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const buildFallbackHtml = (subject, text) => {
  const normalizedSubject = normalizeString(subject);
  const normalizedText = normalizeString(text);

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:640px;margin:0 auto;padding:16px;">',
    `<h2 style="margin:0 0 12px;">${escapeHtml(normalizedSubject)}</h2>`,
    `<p style="white-space:pre-wrap;margin:0;">${escapeHtml(normalizedText || normalizedSubject)}</p>`,
    '</div>',
  ].join('');
};

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
};

const resolveEmailProvider = (provider) => {
  const explicit = normalizeProvider(provider);
  if (explicit) {
    return explicit;
  }

  const configuredProvider = normalizeProvider(process.env.EMAIL_PROVIDER);
  if (configuredProvider) {
    return configuredProvider;
  }

  const notificationProvider = normalizeProvider(process.env.NOTIFICATION_EMAIL_PROVIDER);
  if (notificationProvider) {
    return notificationProvider;
  }

  const configuredMode = normalizeProvider(process.env.EMAIL_DELIVERY_MODE);
  if (configuredMode) {
    return configuredMode;
  }

  const notificationMode = normalizeProvider(process.env.NOTIFICATION_EMAIL_MODE);
  if (notificationMode) {
    return notificationMode;
  }

  if (normalizeString(process.env.RESEND_API_KEY)) {
    return 'resend';
  }

  if (normalizeString(process.env.EMAIL_WEBHOOK_URL || process.env.NOTIFICATION_EMAIL_WEBHOOK_URL)) {
    return 'webhook';
  }

  return 'mock';
};

const normalizeIdempotencyKey = (value) => {
  const idempotencyKey = normalizeString(value);
  if (!idempotencyKey) {
    return null;
  }

  if (idempotencyKey.length > 256) {
    throw new ApiError('idempotencyKey must be at most 256 characters', 400, 'ERR_INVALID_IDEMPOTENCY_KEY');
  }

  return idempotencyKey;
};

const getResendClient = () => {
  const apiKey = normalizeString(process.env.RESEND_API_KEY);
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!cachedResendClient || cachedResendApiKey !== apiKey) {
    cachedResendClient = resendClientFactory(apiKey);
    cachedResendApiKey = apiKey;
  }

  return cachedResendClient;
};

const getFromAddress = (from) => {
  const senderAddress = normalizeString(from || process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL);
  if (!senderAddress) {
    throw new Error('EMAIL_FROM is not configured');
  }

  return senderAddress;
};

const sendViaWebhook = async ({
  recipients,
  from,
  subject,
  text,
  html,
  replyTo,
  cc,
  bcc,
  tags,
  headers,
  attachments,
  scheduledAt,
  idempotencyKey,
  metadata,
}) => {
  const webhookUrl = normalizeString(process.env.EMAIL_WEBHOOK_URL || process.env.NOTIFICATION_EMAIL_WEBHOOK_URL);
  if (!webhookUrl) {
    throw new Error('EMAIL_WEBHOOK_URL is not configured');
  }

  const senderAddress = getFromAddress(from);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'email',
      provider: 'webhook',
      from: senderAddress,
      to: recipients,
      subject,
      text,
      html,
      replyTo,
      cc,
      bcc,
      tags,
      headers,
      attachments,
      scheduledAt,
      idempotencyKey,
      metadata: metadata || {},
    }),
  });

  const rawBody = await response.text();
  const parsedBody = safeJsonParse(rawBody);

  if (!response.ok) {
    throw new Error(`email webhook ${response.status}: ${rawBody.slice(0, 500)}`);
  }

  return {
    provider: 'webhook',
    providerMessageId: parsedBody?.id || null,
    providerResponse: JSON.stringify({
      status: response.status,
      body: parsedBody || rawBody || null,
    }),
  };
};

const sendViaResend = async ({
  recipients,
  from,
  subject,
  text,
  html,
  react,
  template,
  replyTo,
  cc,
  bcc,
  tags,
  headers,
  attachments,
  scheduledAt,
  idempotencyKey,
}) => {
  const resend = getResendClient();
  const senderAddress = getFromAddress(from);

  const requestBody = {
    from: senderAddress,
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject,
  };

  if (cc.length > 0) {
    requestBody.cc = cc.length === 1 ? cc[0] : cc;
  }

  if (bcc.length > 0) {
    requestBody.bcc = bcc.length === 1 ? bcc[0] : bcc;
  }

  if (replyTo.length > 0) {
    requestBody.replyTo = replyTo.length === 1 ? replyTo[0] : replyTo;
  }

  if (scheduledAt) {
    requestBody.scheduledAt = scheduledAt;
  }

  if (headers && typeof headers === 'object') {
    requestBody.headers = headers;
  }

  if (Array.isArray(tags) && tags.length > 0) {
    requestBody.tags = tags;
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    requestBody.attachments = attachments;
  }

  if (idempotencyKey) {
    requestBody.idempotencyKey = idempotencyKey;
  }

  if (template) {
    requestBody.template = template;
  } else {
    if (html) {
      requestBody.html = html;
    }

    if (text) {
      requestBody.text = text;
    }

    if (react) {
      requestBody.react = react;
    }
  }

  const { data, error } = await resend.emails.send(requestBody);

  if (error) {
    const message = normalizeString(error.message || error.name || 'Unknown resend error');
    throw new Error(`resend: ${message}`);
  }

  return {
    provider: 'resend',
    providerMessageId: data?.id || null,
    providerResponse: JSON.stringify({ data, error: null }),
  };
};

const sendViaMock = async ({ recipients, subject }) => {
  console.log(`[EMAIL][MOCK] recipients=${recipients.join(',')} subject=${subject}`);

  return {
    provider: 'mock',
    providerMessageId: null,
    providerResponse: 'email_mock_simulated',
  };
};

const sendEmail = async ({
  to,
  from = null,
  subject,
  text = '',
  html = '',
  react = null,
  template = null,
  cc = null,
  bcc = null,
  replyTo = null,
  scheduledAt = null,
  headers = null,
  tags = null,
  attachments = null,
  idempotencyKey = null,
  provider = null,
  metadata = null,
}) => {
  const recipients = normalizeAddressList(to);
  if (recipients.length === 0) {
    throw new ApiError('At least one recipient email is required', 400, 'ERR_INVALID_EMAIL_RECIPIENT');
  }

  if (recipients.length > 50) {
    throw new ApiError('A maximum of 50 recipients are supported', 400, 'ERR_TOO_MANY_EMAIL_RECIPIENTS');
  }

  const normalizedSubject = normalizeString(subject);
  if (!normalizedSubject) {
    throw new ApiError('Email subject is required', 400, 'ERR_INVALID_EMAIL_SUBJECT');
  }

  const hasTemplate = Boolean(template);
  const hasContentPayload = Boolean(normalizeString(text) || normalizeString(html) || react);

  if (hasTemplate && hasContentPayload) {
    throw new ApiError(
      'template cannot be combined with html, text, or react payloads',
      400,
      'ERR_INVALID_EMAIL_TEMPLATE_PAYLOAD'
    );
  }

  const normalizedText = normalizeString(text) || normalizedSubject;
  const normalizedHtml = normalizeString(html) || buildFallbackHtml(normalizedSubject, normalizedText);
  const resolvedProvider = resolveEmailProvider(provider);
  const normalizedCc = normalizeAddressList(cc);
  const normalizedBcc = normalizeAddressList(bcc);
  const normalizedReplyTo = normalizeAddressList(replyTo || process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO_EMAIL);
  const normalizedScheduledAt = normalizeString(scheduledAt);
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

  if (resolvedProvider === 'webhook') {
    return sendViaWebhook({
      recipients,
      from,
      subject: normalizedSubject,
      text: normalizedText,
      html: normalizedHtml,
      replyTo: normalizedReplyTo,
      cc: normalizedCc,
      bcc: normalizedBcc,
      tags,
      headers,
      attachments,
      scheduledAt: normalizedScheduledAt || null,
      idempotencyKey: normalizedIdempotencyKey,
      metadata,
    });
  }

  if (resolvedProvider === 'resend') {
    return sendViaResend({
      recipients,
      from,
      subject: normalizedSubject,
      text: hasTemplate ? '' : normalizedText,
      html: hasTemplate ? '' : normalizedHtml,
      react,
      template,
      replyTo: normalizedReplyTo,
      cc: normalizedCc,
      bcc: normalizedBcc,
      tags,
      headers,
      attachments,
      scheduledAt: normalizedScheduledAt || null,
      idempotencyKey: normalizedIdempotencyKey,
    });
  }

  return sendViaMock({ recipients, subject: normalizedSubject });
};

const setResendClientFactoryForTests = (factory) => {
  resendClientFactory = factory;
  cachedResendClient = null;
  cachedResendApiKey = null;
};

const resetResendClientFactoryForTests = () => {
  resendClientFactory = (apiKey) => new Resend(apiKey);
  cachedResendClient = null;
  cachedResendApiKey = null;
};

module.exports = {
  sendEmail,
  resolveEmailProvider,
  setResendClientFactoryForTests,
  resetResendClientFactoryForTests,
};
