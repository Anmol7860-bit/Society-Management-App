// ============================================================
// Logger — Structured logging with Winston
// ============================================================
// Used for application logs AND audit events.
// Audit events are tagged with { audit: true } for filtering.
// ============================================================

import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Human-readable format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `  ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    config.isDev ? combine(colorize(), devFormat) : json(),
  ),
  defaultMeta: { service: 'gatekeep-api' },
  transports: [
    new winston.transports.Console(),
    // In production, add file/cloud transports:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/audit.log' }),
  ],
});

/**
 * Log an audit event (login, logout, access change, etc.)
 * These are security-critical events that must be traceable.
 */
export function auditLog(event: string, details: Record<string, unknown>) {
  logger.info(event, {
    audit: true,
    ...details,
    timestamp: new Date().toISOString(),
  });
}
