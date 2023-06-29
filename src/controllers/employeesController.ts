import { RequestHandler } from 'express';
import { PrismaClient, Role, Currency, Department, TechStack } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

// @desc    Get Employees
// @route   GET /api/employees
// @access  Private
export const getEmployees: RequestHandler = async (req, res, next) => {
	try {
		const {
			searchTerm = '',
			currency,
			department,
			techStack,
			isEmployed,
			orderByField,
			orderDirection,
			take,
			page,
		} = req.query;

		if (
			(currency && currency !== Currency.USD && currency !== Currency.EUR && currency !== Currency.BAM) ||
			(department &&
				department !== Department.Administration &&
				department !== Department.Management &&
				department !== Department.Development &&
				department !== Department.Design) ||
			(techStack &&
				techStack !== TechStack.AdminNA &&
				techStack !== TechStack.MgmtNA &&
				techStack !== TechStack.FullStack &&
				techStack !== TechStack.Backend &&
				techStack !== TechStack.Frontend &&
				techStack !== TechStack.UXUI) ||
			(isEmployed && isEmployed !== 'true' && isEmployed !== 'false') ||
			(orderByField &&
				orderByField !== 'firstName' &&
				orderByField !== 'lastName' &&
				orderByField !== 'department' &&
				orderByField !== 'salary' &&
				orderByField !== 'techStack') ||
			(orderDirection && orderDirection !== 'asc' && orderDirection !== 'desc') ||
			(take && (isNaN(Number(take)) || Number(take) < 1)) ||
			(page && (isNaN(Number(page)) || Number(page) < 1))
		)
			throw createHttpError(400, 'Invalid input fields.');

		const skip = page && take ? (Number(page) - 1) * Number(take) : 0;

		let orderBy;
		if (orderByField && orderDirection)
			orderBy = {
				[orderByField as string]: orderDirection,
			};

		const where = {
			OR: [
				{
					AND: [
						{
							firstName: {
								contains: searchTerm && searchTerm.toString().split(' ')[0],
								mode: 'insensitive' as const,
							},
						},
						{
							lastName: {
								contains: searchTerm && searchTerm.toString().split(' ')[1],
								mode: 'insensitive' as const,
							},
						},
					],
				},
				{
					firstName: {
						contains: searchTerm && searchTerm.toString(),
						mode: 'insensitive' as const,
					},
				},
				{
					lastName: {
						contains: searchTerm && searchTerm.toString(),
						mode: 'insensitive' as const,
					},
				},
			],
			currency: currency ? (currency as Currency) : undefined,
			department: department ? (department as Department) : undefined,
			techStack: techStack ? (techStack as TechStack) : undefined,
			isEmployed: isEmployed ? JSON.parse(isEmployed as string) : undefined,
		};

		const count = await prisma.employee.count({ where });

		const employees = await prisma.employee.findMany({
			where,
			orderBy,
			skip: skip < count ? skip : undefined,
			take: take ? Number(take) : undefined,
			include: {
				projects: {
					select: {
						partTime: true,
						project: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		const total = employees.length > 0 ? count : 0;
		const lastPage = take ? Math.ceil(total / Number(take)) : total > 0 ? 1 : 0;
		const currentPage = page ? (Number(page) > lastPage ? 1 : Number(page)) : total > 0 ? 1 : 0;
		const perPage = take ? Number(take) : total;

		return res.status(200).json({
			pageInfo: {
				total,
				currentPage,
				lastPage,
				perPage,
			},
			employees,
		});
	} catch (error) {
		next(error);
	}
};

// @desc    Get Employee By Id
// @route   GET /api/employees/:employeeId
// @access  Private
export const getEmployeeById: RequestHandler = async (req, res, next) => {
	try {
		const employeeId = req.params.employeeId;
		const employee = await prisma.employee.findUnique({
			where: {
				id: employeeId,
			},
			include: {
				projects: {
					select: {
						partTime: true,
						project: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});
		if (!employee) throw createHttpError(404, 'Employee not found.');

		return res.status(200).json(employee);
	} catch (error) {
		next(error);
	}
};

// @desc    Create Employee
// @route   POST /api/employees
// @access  Private
export const createEmployee: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to create employees.');

		const { firstName, lastName, department, salary, currency, techStack } = req.body;
		if (!firstName || !lastName || !department || !salary || !currency || !techStack)
			throw createHttpError(400, 'Missing required fields.');

		if (
			typeof firstName !== 'string' ||
			typeof lastName !== 'string' ||
			(typeof salary !== 'number' && typeof salary !== 'string') ||
			(typeof salary === 'number' && salary <= 0) ||
			(typeof salary === 'string' && (isNaN(Number(salary)) || Number(salary) <= 0)) ||
			(currency !== Currency.USD && currency !== Currency.EUR && currency !== Currency.BAM) ||
			(department !== Department.Administration &&
				department !== Department.Management &&
				department !== Department.Development &&
				department !== Department.Design) ||
			(techStack !== TechStack.AdminNA &&
				techStack !== TechStack.MgmtNA &&
				techStack !== TechStack.FullStack &&
				techStack !== TechStack.Backend &&
				techStack !== TechStack.Frontend &&
				techStack !== TechStack.UXUI) ||
			(department === Department.Administration && techStack !== TechStack.AdminNA) ||
			(department === Department.Management && techStack !== TechStack.MgmtNA) ||
			(department === Department.Development &&
				techStack !== TechStack.FullStack &&
				techStack !== TechStack.Backend &&
				techStack !== TechStack.Frontend) ||
			(department === Department.Design && techStack !== TechStack.UXUI)
		)
			throw createHttpError(400, 'Invalid input fields.');

		let imageData: string | undefined;
		if (req.file) {
			imageData =
				'https://st3.depositphotos.com/1017228/18878/i/450/depositphotos_188781580-stock-photo-handsome-cheerful-young-man-standing.jpg';
		}

		const employee = await prisma.employee.create({
			data: {
				firstName,
				lastName,
				image: imageData,
				department,
				salary: typeof salary === 'string' ? Number(salary) : salary,
				currency,
				techStack,
			},
		});

		return res.status(201).json(employee);
	} catch (error) {
		next(error);
	}
};

// @desc    Update Employee
// @route   PATCH /api/employees/:employeeId
// @access  Private
export const updateEmployee: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to update employees.');

		const employeeId = req.params.employeeId;
		const employee = await prisma.employee.findUnique({
			where: {
				id: employeeId,
			},
		});
		if (!employee) throw createHttpError(404, 'Employee not found.');

		const { firstName, lastName, department, salary, currency, techStack, isEmployed } = req.body;

		if (
			(firstName !== undefined && (typeof firstName !== 'string' || firstName.length === 0)) ||
			(lastName !== undefined && (typeof lastName !== 'string' || lastName.length === 0)) ||
			(salary !== undefined &&
				((typeof salary !== 'number' && typeof salary !== 'string') ||
					(typeof salary === 'number' && salary <= 0) ||
					(typeof salary === 'string' && (isNaN(Number(salary)) || Number(salary) <= 0)))) ||
			(currency !== undefined && currency !== Currency.USD && currency !== Currency.EUR && currency !== Currency.BAM) ||
			(isEmployed !== undefined &&
				((typeof isEmployed !== 'boolean' && typeof isEmployed !== 'string') ||
					(typeof isEmployed === 'string' && isEmployed !== 'true' && isEmployed !== 'false'))) ||
			(department !== undefined &&
				department !== Department.Administration &&
				department !== Department.Management &&
				department !== Department.Development &&
				department !== Department.Design) ||
			(techStack !== undefined &&
				techStack !== TechStack.AdminNA &&
				techStack !== TechStack.MgmtNA &&
				techStack !== TechStack.FullStack &&
				techStack !== TechStack.Backend &&
				techStack !== TechStack.Frontend &&
				techStack !== TechStack.UXUI) ||
			(department &&
				!techStack &&
				((department === Department.Administration && employee.techStack !== TechStack.AdminNA) ||
					(department === Department.Management && employee.techStack !== TechStack.MgmtNA) ||
					(department === Department.Development &&
						employee.techStack !== TechStack.FullStack &&
						employee.techStack !== TechStack.Backend &&
						employee.techStack !== TechStack.Frontend) ||
					(department === Department.Design && employee.techStack !== TechStack.UXUI))) ||
			(techStack &&
				!department &&
				((techStack === TechStack.AdminNA && employee.department !== Department.Administration) ||
					(techStack === TechStack.MgmtNA && employee.department !== Department.Management) ||
					((techStack === TechStack.FullStack || techStack === TechStack.Backend || techStack === TechStack.Frontend) &&
						employee.department !== Department.Development) ||
					(techStack === TechStack.UXUI && employee.department !== Department.Design))) ||
			(department &&
				techStack &&
				((department === Department.Administration && techStack !== TechStack.AdminNA) ||
					(department === Department.Management && techStack !== TechStack.MgmtNA) ||
					(department === Department.Development &&
						techStack !== TechStack.FullStack &&
						techStack !== TechStack.Backend &&
						techStack !== TechStack.Frontend) ||
					(department === Department.Design && techStack !== TechStack.UXUI)))
		)
			throw createHttpError(400, 'Invalid input fields.');

		// let imageData: string | undefined;
		// if (req.file) {
		// 	imageData =
		// 		'https://st3.depositphotos.com/1017228/18878/i/450/depositphotos_188781580-stock-photo-handsome-cheerful-young-man-standing.jpg';
		// }

		const updatedEmployee = await prisma.employee.update({
			where: {
				id: employeeId,
			},
			data: {
				firstName,
				lastName,
				// image: imageData,
				department,
				salary: typeof salary === 'string' ? Number(salary) : salary,
				currency,
				techStack,
				isEmployed:
					(typeof isEmployed === 'string' && isEmployed === 'true') || (typeof isEmployed === 'boolean' && isEmployed)
						? true
						: isEmployed !== undefined
						? false
						: undefined,
			},
		});

		return res.status(200).json(updatedEmployee);
	} catch (error) {
		next(error);
	}
};

// @desc    Delete Employee
// @route   DELETE /api/employees/:employeeId
// @access  Private
export const deleteEmployee: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to delete employees.');

		const employeeId = req.params.employeeId;
		const employee = await prisma.employee.findUnique({
			where: {
				id: employeeId,
			},
		});
		if (!employee) throw createHttpError(404, 'Employee not found.');

		await prisma.employee.delete({
			where: {
				id: employeeId,
			},
		});

		return res.sendStatus(204);
	} catch (error) {
		next(error);
	}
};
