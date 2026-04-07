const winston = require('winston');

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: {
    service: 'stock-sense-backend',
  },
  format: combine(
    timestamp(),
    errors({ stack: true }),
    isProduction
      ? json()
      : combine(
          colorize({ all: true }),
          printf(({ timestamp: ts, level, message, ...meta }) => {
            const metaEntries = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${ts} ${level}: ${message}${metaEntries}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});

const morganLoggerStream = {
  write: (line) => {
    const message = String(line || '').trim();
    if (!message) {
      return;
    }

    logger.http(message);
  },
};

module.exports = {
  logger,
  morganLoggerStream,
};
