import { RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';

import { excludeUserInfo } from '../helpers';

const prisma = new PrismaClient();

// @desc    Get Users
// @route   GET /api/users
// @access  Private
export const getUsers: RequestHandler = async (req, res, next) => {
	try {
		const users = (await prisma.user.findMany()).map(user => excludeUserInfo(user, ['password']));

		return res.status(200).json(users);
	} catch (error) {
		next(error);
	}
};

// @desc    Get User By Id
// @route   GET /api/users/:userId
// @access  Private
export const getUserById: RequestHandler = async (req, res, next) => {
	try {
		const userId = req.params.userId;
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw createHttpError(404, 'User not found.');

		return res.status(200).json(excludeUserInfo(user, ['password']));
	} catch (error) {
		next(error);
	}
};

// @desc    Update User
// @route   PATCH /api/users/:userId
// @access  Private
export const updateUser: RequestHandler = async (req, res, next) => {
	try {
		let loggedInUser = req.user;
		const userId = req.params.userId;
		if (loggedInUser?.role !== Role.Admin && loggedInUser?.id !== userId)
			throw createHttpError(403, 'This user is not allowed to update other users.');

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw createHttpError(404, 'User not found.');
		if (user.role === Role.Admin && user.id !== loggedInUser?.id)
			throw createHttpError(403, 'Cannot update an admin user.');

		const { email, firstName, lastName, password, role } = req.body;

		const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
		if (
			(email !== undefined && (typeof email !== 'string' || !pattern.test(email))) ||
			(firstName !== undefined && (typeof firstName !== 'string' || firstName.length === 0)) ||
			(lastName !== undefined && (typeof lastName !== 'string' || lastName.length === 0)) ||
			(password !== undefined && (typeof password !== 'string' || password.length === 0)) ||
			(role !== undefined && role !== Role.Admin && role !== Role.Guest)
		)
			throw createHttpError(400, 'Invalid input fields.');

		if (email) {
			const existingUser = await prisma.user.findUnique({
				where: {
					email,
				},
			});
			if (existingUser && existingUser.id !== userId) throw createHttpError(409, 'User already exists.');
		}

		const saltRounds = 10;
		let hashedPassword;
		if (password) hashedPassword = await bcrypt.hash(password, saltRounds);

		// let imageData: string | undefined;
		// if (req.file) {
		// 	imageData =
		// 		'https://st3.depositphotos.com/1017228/18878/i/450/depositphotos_188781580-stock-photo-handsome-cheerful-young-man-standing.jpg';
		// }

		const updatedUser = await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				email,
				firstName,
				lastName,
				password: hashedPassword,
				// image: imageData,
				role,
			},
		});

		return res.status(200).json(excludeUserInfo(updatedUser, ['password']));
	} catch (error) {
		next(error);
	}
};

// @desc    Delete User
// @route   DELETE /api/users/:userId
// @access  Private
export const deleteUser: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		const userId = req.params.userId;
		if (loggedInUser?.role !== Role.Admin && loggedInUser?.id !== userId)
			throw createHttpError(403, 'This user is not allowed to delete other users.');

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw createHttpError(404, 'User not found.');
		if (user.role === Role.Admin && user.id !== loggedInUser?.id)
			throw createHttpError(403, 'Cannot delete an admin user.');

		await prisma.user.delete({
			where: {
				id: userId,
			},
		});

		return res.sendStatus(204);
	} catch (error) {
		next(error);
	}
};
