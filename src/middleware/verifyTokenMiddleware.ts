import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import env from '../utils/validateEnv';

type DecodedToken = {
	userId: string;
};

const prisma = new PrismaClient();

const verifyTokenMiddleware: RequestHandler = async (req, res, next) => {
	try {
		const authHeader = (req.headers.authorization || req.headers.Authorization) as string;

		if (!authHeader?.startsWith('Bearer ')) throw Error();

		const token = authHeader.split(' ')[1];
		if (!token) throw Error();

		const decodedAccessToken = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as DecodedToken;

		const userId = decodedAccessToken.userId;
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user) throw Error();

		req.user = user;

		next();
	} catch (error) {
		next(createHttpError(401, 'Authorization failed.'));
	}
};

export default verifyTokenMiddleware;
