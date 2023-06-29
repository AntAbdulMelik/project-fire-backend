import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import * as expenseCategoriesController from '../controllers/expenseCategoriesController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', expenseCategoriesController.getExpenseCategories);
router.get('/:expenseCategoryId', expenseCategoriesController.getExpenseCategoryById);
router.post('/', expenseCategoriesController.createExpenseCategory);
router.patch('/:expenseCategoryId', expenseCategoriesController.updateExpenseCategory);
router.delete('/:expenseCategoryId', expenseCategoriesController.deleteExpenseCategory);

export default router;
