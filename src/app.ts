import 'dotenv/config';
import express from 'express';
import createHttpError, { isHttpError } from 'http-errors';
import swaggerUI from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';

import { corsOptions } from './config/corsOptions';
import swaggerDocs from './utils/swagger';
import errorHandlingMiddleware from './middleware/errorHandlingMiddleware';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import employeeRoutes from './routes/employeeRoutes';
import projectRoutes from './routes/projectRoutes';
import expenseCategoryRoutes from './routes/expenseCategoryRoutes';
import expenseRoutes from './routes/expenseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';

const app = express();

app.use(cors(corsOptions as CorsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/invoices', invoiceRoutes);

app.use((req, res, next) => {
	next(createHttpError(404, 'Endpoint not found.'));
});

app.use(errorHandlingMiddleware);

export default app;
