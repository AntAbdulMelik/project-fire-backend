import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import imageUploadMiddleware from '../middleware/imageUploadMiddleware';
import * as usersController from '../controllers/usersController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', usersController.getUsers);
router.get('/:userId', usersController.getUserById);
router.patch('/:userId', imageUploadMiddleware, usersController.updateUser);
router.delete('/:userId', usersController.deleteUser);

export default router;
