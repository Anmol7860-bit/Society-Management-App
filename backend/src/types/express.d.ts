// ============================================================
// Express Type Augmentation
// ============================================================
// Extends the Express Request type to include our custom
// authentication context so TypeScript is aware of req.ctx
// across the entire codebase.
// ============================================================

import { UserRole } from '../database/inMemoryDb';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authentication context attached by the `authenticate` middleware.
       * Only present on routes that are protected by that middleware.
       *
       * Usage in a controller:
       *   const { userId, role, societyId } = req.ctx;
       */
      ctx: {
        /** UUID of the authenticated user */
        userId: string;

        /**
         * Society the user belongs to.
         * Currently derived from the user's profile.
         * Will be a proper foreign key once multi-tenancy is implemented.
         */
        societyId: string;

        /** Role for downstream RBAC checks */
        role: UserRole;
      };

      /**
       * Unique ID for this request (attached by requestId middleware).
       * Propagated in response headers as X-Request-ID.
       * Useful for tracing logs across services.
       */
      requestId: string;
    }
  }
}
