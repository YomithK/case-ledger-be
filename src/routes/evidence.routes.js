import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
    getEvidenceById,
    updateEvidence,
    deleteEvidence,
    verifyEvidence,
} from '../controllers/evidence.controller.js';

const router = express.Router();

// GET /api/v1/evidence/:id  — Get single evidence
router.get(
    '/:id',
    authenticate,
    authorize('ADMIN', 'INVESTIGATOR', 'NGO'),
    getEvidenceById
);

// PUT /api/v1/evidence/:id  — Update evidence metadata
router.put(
    '/:id',
    authenticate,
    authorize('ADMIN', 'INVESTIGATOR'),
    updateEvidence
);

// DELETE /api/v1/evidence/:id  — Soft delete + Cloudinary destroy
router.delete(
    '/:id',
    authenticate,
    authorize('ADMIN'),
    deleteEvidence
);

// PUT /api/v1/evidence/:id/verify  — Verify evidence
router.put(
    '/:id/verify',
    authenticate,
    authorize('ADMIN'),
    verifyEvidence
);

export default router;
