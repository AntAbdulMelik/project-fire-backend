import { Request, Response, NextFunction } from 'express';
import { isHttpError } from 'http-errors';

const errorHandlingMiddleware = (error: unknown, req: Request, res: Response, next: NextFunction) => {
	console.error(error);
	let errorMessage = 'An unknown error occured.';
	let statusCode = 500;
	if (isHttpError(error)) {
		errorMessage = error.message;
		statusCode = error.status;
	}
	res.status(statusCode).json({ error: errorMessage });
};

export default errorHandlingMiddleware;
