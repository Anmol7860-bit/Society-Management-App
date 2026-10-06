// ============================================================
// Express App — Application setup
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { requestId } from './middleware/requestId';
import { authenticate } from './middleware/authenticate';
import authRoutes from './routes/auth';
import otpRoutes from './routes/otp';

const app = express();

// ── Request ID (must be FIRST — so all logs include it) ──────────
app.use(requestId);

// ── Security Middleware ────────────────────────────────────────
app.use(helmet());                        // Security headers
app.use(cors({
  origin: config.corsOrigin,              // Allow frontend origin
  credentials: true,
}));

// ── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Parse JSON, limit body size
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 80),
  });
  next();
});

// ── Health Check ───────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gatekeep-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/otp', otpRoutes);

// ── Protected: GET /api/v1/auth/me ─────────────────────────────
// A lightweight "who am I" endpoint that verifies the entire
// authenticate middleware chain end-to-end.
app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const { userId, role, societyId } = req.ctx;
  const user = require('./database/inMemoryDb').db.users.find(
    (u: { id: string }) => u.id === userId,
  );

  res.json({
    success: true,
    data: {
      userId,
      role,
      societyId,
      email: user?.email,
      name: user?.name,
    },
  });
});

// ── 404 Handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
});

// ── Global Error Handler (must be LAST) ────────────────────────
app.use(errorHandler);

export default app;
