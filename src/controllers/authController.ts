import { RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import createHttpError from 'http-errors';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

import env from '../utils/validateEnv';
import { excludeUserInfo } from '../helpers';

const prisma = new PrismaClient();

type DecodedToken = {
	userId: string;
};

// @desc    Refresh Token
// @route   GET /api/auth/refresh
// @access  Public
export const refreshToken: RequestHandler = async (req, res, next) => {
	try {
		const cookies = req.cookies;
		if (!cookies?.jwt) throw Error();

		const refreshToken = cookies.jwt;

		const decodedRefreshToken = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as DecodedToken;

		const userId = decodedRefreshToken.userId;
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw Error();

		const accessToken = jwt.sign({ userId: user.id }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

		return res.status(200).json({ user: excludeUserInfo(user, ['password']), accessToken });
	} catch (error) {
		next(createHttpError(403, 'Failed to refresh token.'));
	}
};

// @desc    Register User
// @route   POST /api/auth/register
// @access  Public
export const registerUser: RequestHandler = async (req, res, next) => {
	try {
		const { email, firstName, lastName, password, role } = req.body;
		if (!email || !firstName || !lastName || !password) throw createHttpError(400, 'Missing required fields.');

		const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
		if (
			!pattern.test(email) ||
			typeof firstName !== 'string' ||
			typeof lastName !== 'string' ||
			typeof password !== 'string' ||
			(role !== undefined && role !== Role.Admin && role !== Role.Guest)
		)
			throw createHttpError(400, 'Invalid input fields.');

		const existingUser = await prisma.user.findUnique({
			where: {
				email,
			},
		});
		if (existingUser) throw createHttpError(409, 'User already exists.');

		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		let imageData: string | undefined;
		if (req.file) {
			imageData =
				'https://st3.depositphotos.com/1017228/18878/i/450/depositphotos_188781580-stock-photo-handsome-cheerful-young-man-standing.jpg';
		}

		const user = await prisma.user.create({
			data: {
				email,
				firstName,
				lastName,
				password: hashedPassword,
				image: imageData,
				role,
			},
		});

		const accessToken = jwt.sign({ userId: user.id }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
		const refreshToken = jwt.sign({ userId: user.id }, env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' });

		res.cookie('jwt', refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			maxAge: 1 * 24 * 60 * 60 * 1000,
		});

		return res.status(201).json({ user: excludeUserInfo(user, ['password']), accessToken });
	} catch (error) {
		next(error);
	}
};

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
export const loginUser: RequestHandler = async (req, res, next) => {
	try {
		const { email, password, rememberMe } = req.body;
		if (!email || !password) throw createHttpError(400, 'Missing required fields.');

		const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
		if (
			!pattern.test(email) ||
			typeof password !== 'string' ||
			(rememberMe !== undefined &&
				((typeof rememberMe !== 'string' && typeof rememberMe !== 'boolean') ||
					(typeof rememberMe === 'string' && rememberMe !== 'true' && rememberMe !== 'false')))
		)
			throw createHttpError(400, 'Invalid input fields.');

		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		});
		if (!user) throw createHttpError(401, 'Invalid email or password.');

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) throw createHttpError(401, 'Invalid email or password.');

		const accessToken = jwt.sign({ userId: user.id }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
		const refreshToken = jwt.sign({ userId: user.id }, env.REFRESH_TOKEN_SECRET, {
			expiresIn:
				(typeof rememberMe === 'string' && rememberMe === 'true') || (typeof rememberMe === 'boolean' && rememberMe)
					? '7d'
					: '1d',
		});

		res.cookie('jwt', refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			maxAge:
				(typeof rememberMe === 'string' && rememberMe === 'true') || (typeof rememberMe === 'boolean' && rememberMe)
					? 7 * 24 * 60 * 60 * 1000
					: 1 * 24 * 60 * 60 * 1000,
		});

		return res.status(200).json({ user: excludeUserInfo(user, ['password']), accessToken });
	} catch (error) {
		next(error);
	}
};

// @desc    Logout User
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser: RequestHandler = async (req, res, next) => {
	try {
		const cookies = req.cookies;
		if (!cookies?.jwt) return res.sendStatus(204);
		res.clearCookie('jwt', { httpOnly: true, sameSite: 'none', secure: true });

		return res.status(200).json({ message: 'User logged out successfully.' });
	} catch (error) {
		next(error);
	}
};

// @desc    Send Reset Password Email
// @route   POST /api/auth/reset-password
// @access  Public
export const sendResetPasswordEmail: RequestHandler = async (req, res, next) => {
	try {
		const { email } = req.body;
		if (!email) throw createHttpError(400, 'Email not provided.');

		const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
		if (!pattern.test(email)) throw createHttpError(400, 'Invalid input fields.');

		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		});
		if (!user) throw createHttpError(404, 'User not found.');

		const tokenObj = await prisma.token.create({
			data: {
				token: jwt.sign({ userId: user.id }, env.TOKEN_OBJ_SECRET, {
					expiresIn: '15m',
				}),
				expiration: new Date(Date.now() + 15 * 60 * 1000),
				userId: user.id,
			},
		});

		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: env.EMAIL_ADDRESS,
				pass: env.EMAIL_PASSWORD,
			},
		});

		const template = handlebars.compile(
			fs.readFileSync(path.join(__dirname, '..', 'views', 'resetPassword.hbs'), 'utf8')
		);

		const htmlToSend = template({
			resetLink: `${env.CLIENT_URL}/${tokenObj.userId}/reset-password/${tokenObj.token}/`,
		});

		const mailOptions = {
			from: env.EMAIL_ADDRESS,
			to: email,
			subject: 'Password Reset Request',
			html: htmlToSend,
		};

		transporter.sendMail(mailOptions);

		return res.status(200).json({ message: 'An email has been sent to reset your password.' });
	} catch (error) {
		next(error);
	}
};

// @desc    Reset Password
// @route   POST /api/auth/:userId/reset-password/:token
// @access  Public
export const resetPassword: RequestHandler = async (req, res, next) => {
	try {
		const userId = req.params.userId;
		const token = req.params.token;

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw createHttpError(400, 'Link is invalid or has expired.');

		const tokenObj = await prisma.token.findUnique({
			where: {
				token_userId: { token, userId },
			},
		});
		if (!tokenObj) throw createHttpError(400, 'Link is invalid or has expired.');

		const currentDate = new Date();
		const expirationDate = tokenObj.expiration;

		if (currentDate > expirationDate) throw createHttpError(400, 'Link is invalid or has expired.');

		const { password } = req.body;
		if (!password) throw createHttpError(400, 'Password not provided.');

		if (typeof password !== 'string') throw createHttpError(400, 'Invalid input fields.');

		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				password: hashedPassword,
			},
		});

		await prisma.token.deleteMany({
			where: {
				userId,
			},
		});

		return res.status(200).json({ message: 'Your password has been reset successfully.' });
	} catch (error) {
		next(error);
	}
};
