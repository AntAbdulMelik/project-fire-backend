import { RequestHandler } from 'express';
import { PrismaClient, Role, Month } from '@prisma/client';
import createHttpError from 'http-errors';

import { excludeExpenseInfo, getEmployeeSalaryInBAM } from '../helpers';

const prisma = new PrismaClient();

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

// @desc    Get Expenses
// @route   GET /api/expenses
// @access  Private
export const getExpenses: RequestHandler = async (req, res, next) => {
	try {
		const expenses = (
			await prisma.expense.findMany({
				include: {
					expenseCategory: true,
				},
			})
		).map(expense => excludeExpenseInfo(expense, ['expenseCategoryId']));

		return res.status(200).json(expenses);
	} catch (error) {
		next(error);
	}
};

// @desc    Get Expense By Id
// @route   GET /api/expenses/:expenseId
// @access  Private
export const getExpenseById: RequestHandler = async (req, res, next) => {
	try {
		const expenseId = req.params.expenseId;
		const expense = await prisma.expense.findUnique({
			where: {
				id: expenseId,
			},
			include: {
				expenseCategory: true,
			},
		});
		if (!expense) throw createHttpError(404, 'Expense not found.');

		return res.status(200).json(excludeExpenseInfo(expense, ['expenseCategoryId']));
	} catch (error) {
		next(error);
	}
};

// @desc    Get Expenses Info
// @route   GET /api/expenses/info
// @access  Private
export const getExpensesInfo: RequestHandler = async (req, res, next) => {
	try {
		const { startDate, endDate } = req.query;

		if ((startDate && isNaN(Date.parse(startDate as string))) || (endDate && isNaN(Date.parse(endDate as string))))
			throw createHttpError(400, 'Invalid input fields.');

		let expenses;

		expenses = await prisma.expense.groupBy({
			by: ['year', 'month'],
			where: {
				year: {
					gte: startDate ? new Date(startDate as string).getFullYear() : undefined,
					lte: endDate ? new Date(endDate as string).getFullYear() : undefined,
				},
				month: {
					in: months
						.filter((_, index) => {
							const startMonth = startDate ? new Date(startDate as string).getMonth() : 0;
							const endMonth = endDate ? new Date(endDate as string).getMonth() : months.length - 1;
							return index >= startMonth && index <= endMonth;
						})
						.map(month => month as Month),
				},
			},
			_sum: {
				plannedExpense: true,
				actualExpense: true,
			},
		});

		expenses = expenses.map(expense => ({
			year: expense.year,
			month: expense.month,
			plannedExpense: expense._sum.plannedExpense ?? 0,
			actualExpense: expense._sum.actualExpense ?? 0,
		}));

		const totalPlannedExpense = expenses.reduce((total, expense) => total + expense.plannedExpense, 0);
		const totalActualExpense = expenses.reduce((total, expense) => total + expense.actualExpense, 0);
		const netProfit = totalPlannedExpense - totalActualExpense;

		return res.status(200).json({ totalPlannedExpense, totalActualExpense, netProfit, expenses });
	} catch (error) {
		next(error);
	}
};

// @desc    Create Expense
// @route   POST /api/expenses
// @access  Private
export const createExpense: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to create expenses.');

		const { year, month, plannedExpense, actualExpense, expenseCategory } = req.body;
		if (!year || !month || !expenseCategory) throw createHttpError(400, 'Missing required fields.');

		if (
			typeof year !== 'number' ||
			year < 1990 ||
			year > 2100 ||
			!months.includes(month) ||
			(plannedExpense !== undefined &&
				plannedExpense !== null &&
				(typeof plannedExpense !== 'number' || plannedExpense < 0)) ||
			(actualExpense !== undefined &&
				actualExpense !== null &&
				(typeof actualExpense !== 'number' || actualExpense < 0)) ||
			typeof expenseCategory !== 'string'
		)
			throw createHttpError(400, 'Invalid input fields.');

		const existingExpenseCategory = await prisma.expenseCategory.findFirst({
			where: {
				name: {
					equals: expenseCategory,
					mode: 'insensitive',
				},
			},
		});
		if (!existingExpenseCategory) throw createHttpError(404, 'Expense category not found.');

		const existingExpense = await prisma.expense.findUnique({
			where: {
				year_month_expenseCategoryId: { year, month, expenseCategoryId: existingExpenseCategory.id },
			},
		});
		if (existingExpense) throw createHttpError(409, 'Expense already exists.');

		let calculatedPlannedExpense = 0;

		if (expenseCategory.toLowerCase() === 'direct') {
			const projects = await prisma.project.findMany({
				where: {
					startDate: { lte: new Date(year, months.indexOf(month) + 1, 0) },
					endDate: { gte: new Date(year, months.indexOf(month), 1) },
				},
				select: {
					employees: {
						select: {
							partTime: true,
							employee: {
								select: {
									salary: true,
									currency: true,
								},
							},
						},
					},
				},
			});

			calculatedPlannedExpense = projects.reduce((total, { employees }) => {
				const cost = employees.reduce((sum, { partTime, employee }) => {
					const salary = employee.salary ?? 0;
					const currency = employee.currency ?? 'BAM';
					return sum + getEmployeeSalaryInBAM(salary, currency) * (partTime ? 0.5 : 1);
				}, 0);
				return total + cost;
			}, 0);
		}

		const finalPlannedExpense = expenseCategory.toLowerCase() === 'direct' ? calculatedPlannedExpense : plannedExpense;

		const expense = await prisma.expense.create({
			data: {
				year,
				month,
				plannedExpense: finalPlannedExpense ?? actualExpense,
				actualExpense: actualExpense ?? finalPlannedExpense,
				expenseCategoryId: existingExpenseCategory.id,
			},
			include: {
				expenseCategory: true,
			},
		});

		return res.status(201).json(excludeExpenseInfo(expense, ['expenseCategoryId']));
	} catch (error) {
		next(error);
	}
};

// @desc    Update Expense
// @route   PATCH /api/expenses/:expenseId
// @access  Private
export const updateExpense: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to update expenses.');

		const expenseId = req.params.expenseId;
		const expense = await prisma.expense.findUnique({
			where: {
				id: expenseId,
			},
			include: {
				expenseCategory: {
					select: {
						name: true,
					},
				},
			},
		});
		if (!expense) throw createHttpError(404, 'Expense not found.');

		const { year, month, plannedExpense, actualExpense, expenseCategory } = req.body;

		if (
			(year !== undefined && (typeof year !== 'number' || year < 1990 || year > 2100)) ||
			(month !== undefined && !months.includes(month)) ||
			(plannedExpense !== undefined &&
				plannedExpense !== null &&
				(typeof plannedExpense !== 'number' || plannedExpense < 0)) ||
			(actualExpense !== undefined &&
				actualExpense !== null &&
				(typeof actualExpense !== 'number' || actualExpense < 0)) ||
			(expenseCategory !== undefined && (typeof expenseCategory !== 'string' || expenseCategory.length === 0))
		)
			throw createHttpError(400, 'Invalid input fields.');

		const searchYear = year || expense.year;
		const searchMonth = month || expense.month;
		const searchName = expenseCategory || expense.expenseCategory.name;

		const existingExpenseCategory = await prisma.expenseCategory.findFirst({
			where: {
				name: {
					equals: searchName,
					mode: 'insensitive',
				},
			},
		});
		if (!existingExpenseCategory) throw createHttpError(404, 'Expense category not found.');

		const existingExpense = await prisma.expense.findUnique({
			where: {
				year_month_expenseCategoryId: {
					year: searchYear,
					month: searchMonth,
					expenseCategoryId: existingExpenseCategory.id,
				},
			},
		});
		if (existingExpense && existingExpense.id !== expenseId) throw createHttpError(409, 'Expense already exists.');

		let calculatedPlannedExpense = 0;

		if (searchName.toLowerCase() === 'direct') {
			const projects = await prisma.project.findMany({
				where: {
					startDate: { lte: new Date(searchYear, months.indexOf(searchMonth) + 1, 0) },
					endDate: { gte: new Date(searchYear, months.indexOf(searchMonth), 1) },
				},
				select: {
					employees: {
						select: {
							partTime: true,
							employee: {
								select: {
									salary: true,
									currency: true,
								},
							},
						},
					},
				},
			});

			calculatedPlannedExpense = projects.reduce((total, { employees }) => {
				const cost = employees.reduce((sum, { partTime, employee }) => {
					const salary = employee.salary ?? 0;
					const currency = employee.currency ?? 'BAM';
					return sum + getEmployeeSalaryInBAM(salary, currency) * (partTime ? 0.5 : 1);
				}, 0);
				return total + cost;
			}, 0);
		}

		const finalPlannedExpense = searchName.toLowerCase() === 'direct' ? calculatedPlannedExpense : plannedExpense;

		const updatedExpense = await prisma.expense.update({
			where: {
				id: expenseId,
			},
			data: {
				year,
				month,
				plannedExpense: finalPlannedExpense,
				actualExpense,
				expenseCategoryId: existingExpenseCategory.id,
			},
			include: {
				expenseCategory: true,
			},
		});

		return res.status(200).json(excludeExpenseInfo(updatedExpense, ['expenseCategoryId']));
	} catch (error) {
		next(error);
	}
};

// @desc    Delete Expense
// @route   DELETE /api/expenses/:expenseId
// @access  Private
export const deleteExpense: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to delete expenses.');

		const expenseId = req.params.expenseId;
		const expense = await prisma.expense.findUnique({
			where: {
				id: expenseId,
			},
		});
		if (!expense) throw createHttpError(404, 'Expense not found.');

		await prisma.expense.delete({
			where: {
				id: expenseId,
			},
		});

		return res.sendStatus(204);
	} catch (error) {
		next(error);
	}
};
