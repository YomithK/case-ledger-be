import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
