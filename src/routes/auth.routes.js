import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { registerValidation, loginValidation } from '../validations/auth.validation.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

export default router;
