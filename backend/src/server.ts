// ============================================================
// Server Entry Point — Start the HTTP server
// ============================================================

import app from './app';
import { config } from './config';
import { db } from './database/inMemoryDb';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Seed the in-memory database with test users
    await db.seed();
    logger.info(`Database seeded with ${db.users.length} users`);

    // Start listening
    app.listen(config.port, () => {
      logger.info(`
  ╔════════════════════════════════════════════╗
  ║   🛡️  GateKeep API Server                  ║
  ║                                            ║
  ║   Environment : ${config.nodeEnv.padEnd(25)}║
  ║   Port        : ${String(config.port).padEnd(25)}║
  ║   Health      : http://localhost:${config.port}/api/v1/health ║
  ║   Login API   : POST /api/v1/auth/login    ║
  ╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
