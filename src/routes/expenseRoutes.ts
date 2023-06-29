import express from 'express';

import verifyTokenMiddleware from '../middleware/verifyTokenMiddleware';
import * as expensesController from '../controllers/expensesController';

const router = express.Router();

router.use(verifyTokenMiddleware);

router.get('/', expensesController.getExpenses);
router.get('/info', expensesController.getExpensesInfo);
router.get('/:expenseId', expensesController.getExpenseById);
router.post('/', expensesController.createExpense);
router.patch('/:expenseId', expensesController.updateExpense);
router.delete('/:expenseId', expensesController.deleteExpense);

export default router;
