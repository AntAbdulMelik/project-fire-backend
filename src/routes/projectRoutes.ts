import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import * as projectsController from '../controllers/projectsController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', projectsController.getProjects);
router.get('/info', projectsController.getProjectsInfo);
router.get('/:projectId', projectsController.getProjectById);
router.post('/', projectsController.createProject);
router.patch('/:projectId', projectsController.updateProject);
router.delete('/:projectId', projectsController.deleteProject);

export default router;
