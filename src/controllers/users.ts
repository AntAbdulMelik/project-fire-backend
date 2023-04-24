import { RequestHandler } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import fs from 'fs';

import { UserModel, UserRole } from '../models/user';
import * as UsersInterfaces from '../interfaces/users';
import env from '../utils/validate-env';

export const getUsers: RequestHandler<unknown, UsersInterfaces.GetUsersRes[], unknown, unknown> = async (
	req,
	res,
	next
) => {
	try {
		const users = await UserModel.find().select('-password');
		const usersResponse = users.map(user => ({
			id: user._id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			image: user.image,
		}));
		res.status(200).json(usersResponse);
	} catch (error) {
		next(error);
	}
};

export const getUserById: RequestHandler<
	UsersInterfaces.GetUserByIdParams,
	UsersInterfaces.GetUserByIdRes,
	unknown,
	unknown
> = async (req, res, next) => {
	try {
		const userId = req.params.userId;
		const user = await UserModel.findById(userId).select('-password');

		if (!user) throw createHttpError(404, 'User not found.');

		const userResponse = {
			id: user._id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			image: user.image,
		};

		return res.status(200).json(userResponse);
	} catch (error) {
		next(error);
	}
};

export const registerUser: RequestHandler<unknown, unknown, UsersInterfaces.RegisterUserReq, unknown> = async (
	req,
	res,
	next
) => {
	const { email, password, firstName, lastName, role } = req.body;

	try {
		if (!email || !password || !firstName || !lastName || !role) throw createHttpError(400, 'Missing required fields.');

		const existingUser = await UserModel.findOne({ email });
		if (existingUser) throw createHttpError(409, 'Email already registered.');

		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		let imageData: string | undefined = undefined;
		if (req.file) {
			const buffer = await fs.promises.readFile(req.file.path);
			const fileType = req.file.mimetype.split('/')[1];
			const base64EncodedData = buffer.toString('base64');
			imageData = `data:image/${fileType};base64,${base64EncodedData}`;

			await fs.promises.unlink(req.file.path);
		}

		const user = await UserModel.create({
			email,
			password: hashedPassword,
			firstName,
			lastName,
			role,
			image: imageData,
		});

		// 1d in milliseconds
		const expireLength = 1000 * 60 * 60 * 24;
		const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, {
			expiresIn: expireLength,
		});

		return res.status(201).json({
			user: { id: user._id, email, firstName, lastName, role, image: imageData },
			token,
			expiresIn: expireLength,
		});
	} catch (error) {
		next(error);
	}
};

export const loginUser: RequestHandler<unknown, unknown, UsersInterfaces.LoginUserReq, unknown> = async (
	req,
	res,
	next
) => {
	const { email, password, rememberMe } = req.body;

	try {
		if (!email || !password) throw createHttpError(400, 'Missing required fields.');

		const user = await UserModel.findOne({ email });
		if (!user) throw createHttpError(401, 'Invalid email or password.');

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) throw createHttpError(401, 'Invalid email or password.');

		// Either 7d in milliseconds, or 1d in milliseconds
		const expireLength = rememberMe ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
		const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, {
			expiresIn: expireLength,
		});

		return res.status(200).json({
			user: {
				id: user._id,
				email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				image: user.image,
			},
			token,
			expiresIn: expireLength,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteUser: RequestHandler<
	UsersInterfaces.DeleteUserParams,
	unknown,
	UsersInterfaces.DeleteUserReq,
	unknown
> = async (req, res, next) => {
	try {
		const userId = req.params.userId;
		const user = await UserModel.findById(userId);

		if (!user) throw createHttpError(404, 'User not found.');

		if (user.role === UserRole.Admin) {
			throw createHttpError(403, 'Cannot delete an admin user.');
		}

		if (req.body.userId === userId) throw createHttpError(403, 'You are not authorized to delete yourself.');

		await user.deleteOne();

		return res.status(200).json({ message: 'User deleted successfully.' });
	} catch (error) {
		next(error);
	}
};
