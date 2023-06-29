import { RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

// @desc    Get Expense Categories
// @route   GET /api/expense-categories
// @access  Private
export const getExpenseCategories: RequestHandler = async (req, res, next) => {
	try {
		const expenseCategories = await prisma.expenseCategory.findMany();

		return res.status(200).json(expenseCategories);
	} catch (error) {
		next(error);
	}
};

// @desc    Get Expense Category By Id
// @route   GET /api/expense-categories/:expenseCategoryId
// @access  Private
export const getExpenseCategoryById: RequestHandler = async (req, res, next) => {
	try {
		const expenseCategoryId = req.params.expenseCategoryId;
		const expenseCategory = await prisma.expenseCategory.findUnique({
			where: {
				id: expenseCategoryId,
			},
		});
		if (!expenseCategory) throw createHttpError(404, 'Expense category not found.');

		return res.status(200).json(expenseCategory);
	} catch (error) {
		next(error);
	}
};

// @desc    Create Expense Category
// @route   POST /api/expense-categories
// @access  Private
export const createExpenseCategory: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin)
			throw createHttpError(403, 'This user is not allowed to create expense categories.');

		const { name, description } = req.body;
		if (!name || !description) throw createHttpError(400, 'Missing required fields.');

		if (typeof name !== 'string' || typeof description !== 'string')
			throw createHttpError(400, 'Invalid input fields.');

		const existingExpenseCategory = await prisma.expenseCategory.findFirst({
			where: {
				name: {
					equals: name,
					mode: 'insensitive',
				},
			},
		});
		if (existingExpenseCategory) throw createHttpError(409, 'Expense category already exists.');

		const expenseCategory = await prisma.expenseCategory.create({
			data: {
				name,
				description,
			},
		});

		return res.status(201).json(expenseCategory);
	} catch (error) {
		next(error);
	}
};

// @desc    Update Expense Category
// @route   PATCH /api/expense-categories/:expenseCategoryId
// @access  Private
export const updateExpenseCategory: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin)
			throw createHttpError(403, 'This user is not allowed to update expense categories.');

		const expenseCategoryId = req.params.expenseCategoryId;
		const expenseCategory = await prisma.expenseCategory.findUnique({
			where: {
				id: expenseCategoryId,
			},
		});
		if (!expenseCategory) throw createHttpError(404, 'Expense category not found.');

		const { name, description } = req.body;

		if (
			(name !== undefined && (typeof name !== 'string' || name.length === 0)) ||
			(description !== undefined && (typeof description !== 'string' || description.length === 0))
		)
			throw createHttpError(400, 'Invalid input fields.');

		if (name) {
			const existingExpenseCategory = await prisma.expenseCategory.findFirst({
				where: {
					name: {
						equals: name,
						mode: 'insensitive',
					},
				},
			});
			if (existingExpenseCategory && existingExpenseCategory.id !== expenseCategoryId)
				throw createHttpError(409, 'Expense category already exists.');
		}

		const updatedExpenseCategory = await prisma.expenseCategory.update({
			where: {
				id: expenseCategoryId,
			},
			data: {
				name,
				description,
			},
		});

		return res.status(200).json(updatedExpenseCategory);
	} catch (error) {
		next(error);
	}
};

// @desc    Delete Expense Category
// @route   DELETE /api/expense-categories/:expenseCategoryId
// @access  Private
export const deleteExpenseCategory: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin)
			throw createHttpError(403, 'This user is not allowed to delete expense categories.');

		const expenseCategoryId = req.params.expenseCategoryId;
		const expenseCategory = await prisma.expenseCategory.findUnique({
			where: {
				id: expenseCategoryId,
			},
		});
		if (!expenseCategory) throw createHttpError(404, 'Expense category not found.');

		await prisma.expenseCategory.delete({
			where: {
				id: expenseCategoryId,
			},
		});

		return res.sendStatus(204);
	} catch (error) {
		next(error);
	}
};
