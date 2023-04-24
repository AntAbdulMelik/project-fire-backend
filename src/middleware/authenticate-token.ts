import { Request, RequestHandler } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import * as AuthTokenInterfaces from '../interfaces/authenticate-token';
import env from '../utils/validate-env';

const authenticateToken: RequestHandler<unknown, unknown, AuthTokenInterfaces.AuthenticatedRequest, unknown> = (
	req,
	res,
	next
) => {
	const token = req.headers.authorization?.split(' ')[1] ?? null;

	if (!token) {
		return next(createHttpError(401, 'No token provided. Please provide a valid token.'));
	}

	try {
		const decodedToken = jwt.verify(token, env.JWT_SECRET) as AuthTokenInterfaces.DecodedToken;
		req.body.userId = decodedToken.userId;

		next();
	} catch (err) {
		return next(createHttpError(401, 'Invalid or expired token. Please log in again.'));
	}
};

export default authenticateToken;
