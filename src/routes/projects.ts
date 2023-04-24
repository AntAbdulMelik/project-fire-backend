import express from 'express';

import * as ProjectsController from '../controllers/projects';
import authenticateToken from '../middleware/authenticate-token';

const router = express.Router();

router.get('/', authenticateToken, ProjectsController.getProjects);
router.get('/info', authenticateToken, ProjectsController.getProjectsInfo);
router.get('/:projectId', authenticateToken, ProjectsController.getProjectById);
router.post('/', authenticateToken, ProjectsController.createProject);
router.delete('/:projectId', authenticateToken, ProjectsController.deleteProject);

export default router;
