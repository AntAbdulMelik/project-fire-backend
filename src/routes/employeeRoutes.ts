import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import imageUploadMiddleware from '../middleware/imageUploadMiddleware';
import * as employeesController from '../controllers/employeesController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', employeesController.getEmployees);
router.get('/:employeeId', employeesController.getEmployeeById);
router.post('/', imageUploadMiddleware, employeesController.createEmployee);
router.patch('/:employeeId', imageUploadMiddleware, employeesController.updateEmployee);
router.delete('/:employeeId', employeesController.deleteEmployee);

export default router;
