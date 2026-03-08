import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import caseRoutes from './case.routes.js';
import caseProgressRoutes from './caseProgress.routes.js';
import progressRoutes from './progress.routes.js';
import caseEvidenceRoutes from './caseEvidence.routes.js';
import evidenceRoutes from './evidence.routes.js';
import reportRoutes from './report.routes.js';
import refRoutes from './ref.routes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cases', caseRoutes);

// Case Progress routes
// Nested: POST /cases/:id/progress  |  GET /cases/:id/progress
router.use('/cases/:id/progress', caseProgressRoutes);

// Standalone progress entry routes
// PUT /progress/:id  |  DELETE /progress/:id
router.use('/progress', progressRoutes);

// Evidence routes
// Nested:    POST /cases/:caseId/evidence  |  GET /cases/:caseId/evidence
// Standalone: GET/PUT/DELETE /evidence/:id  |  PUT /evidence/:id/verify
router.use('/cases/:caseId/evidence', caseEvidenceRoutes);
router.use('/evidence', evidenceRoutes);

// Reports & Analytics routes
router.use('/reports', reportRoutes);

// Reference data routes (lookup helpers)
router.use('/ref', refRoutes);

export default router;
