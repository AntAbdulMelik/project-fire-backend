import express from 'express';

import imageUploadMiddleware from '../middleware/imageUploadMiddleware';
import * as authController from '../controllers/authController';

const router = express.Router();

router.get('/refresh', authController.refreshToken);
router.post('/register', imageUploadMiddleware, authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);
router.post('/reset-password', authController.sendResetPasswordEmail);
router.post('/:userId/reset-password/:token', authController.resetPassword);

export default router;
