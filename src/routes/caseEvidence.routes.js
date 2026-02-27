import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
    uploadEvidence,
    getEvidenceByCase,
} from '../controllers/evidence.controller.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access :caseId from parent

// POST /api/v1/cases/:caseId/evidence  — Upload evidence
router.post(
    '/',
    authenticate,
    authorize('ADMIN', 'INVESTIGATOR'),
    upload.single('file'),
    uploadEvidence
);

// GET /api/v1/cases/:caseId/evidence  — List evidence for a case
router.get(
    '/',
    authenticate,
    authorize('ADMIN', 'INVESTIGATOR', 'NGO'),
    getEvidenceByCase
);

export default router;
