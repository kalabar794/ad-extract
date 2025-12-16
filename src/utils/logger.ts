import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  ]
});

// Create a child logger for specific components
export function createLogger(component: string) {
  return logger.child({ component });
}

export default logger;
