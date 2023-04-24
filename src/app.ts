import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import createHttpError, { isHttpError } from 'http-errors';
import cors from 'cors';

import UsersRoutes from './routes/users';
import ProjectsRoutes from './routes/projects';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', UsersRoutes);
app.use('/api/projects', ProjectsRoutes);

app.use((req, res, next) => {
	next(createHttpError(404, 'Endpoint not found.'));
});

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
	console.error(error);
	let errorMessage = 'An unknown error occured.';
	let statusCode = 500;
	if (isHttpError(error)) {
		errorMessage = error.message;
		statusCode = error.status;
	}
	res.status(statusCode).json({ error: errorMessage });
});

export default app;
