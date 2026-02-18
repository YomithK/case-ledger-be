import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import caseRoutes from './case.routes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cases', caseRoutes);

export default router;
