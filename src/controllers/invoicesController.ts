import { RequestHandler } from 'express';
import { PrismaClient, Role, InvoiceStatus } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

// @desc    Get Invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices: RequestHandler = async (req, res, next) => {
	try {
		const { client = '', invoiceStatus, orderByField, orderDirection, take, page } = req.query;

		if (
			(invoiceStatus &&
				invoiceStatus !== InvoiceStatus.Paid &&
				invoiceStatus !== InvoiceStatus.Sent &&
				invoiceStatus !== InvoiceStatus.NotSent) ||
			(orderByField &&
				orderByField !== 'client' &&
				orderByField !== 'industry' &&
				orderByField !== 'totalHoursBilled' &&
				orderByField !== 'amountBilledBAM' &&
				orderByField !== 'invoiceStatus') ||
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
			client: {
				contains: client && client.toString(),
				mode: 'insensitive' as const,
			},
			invoiceStatus: invoiceStatus ? (invoiceStatus as InvoiceStatus) : undefined,
		};

		const count = await prisma.invoice.count({ where });

		const invoices = await prisma.invoice.findMany({
			where,
			orderBy,
			skip: skip < count ? skip : undefined,
			take: take ? Number(take) : undefined,
		});

		const total = invoices.length > 0 ? count : 0;
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
			invoices,
		});
	} catch (error) {
		next(error);
	}
};

// @desc    Get Invoices
// @route   GET /api/invoices/:invoiceId
// @access  Private
export const getInvoiceById: RequestHandler = async (req, res, next) => {
	try {
		const invoiceId = req.params.invoiceId;
		const invoice = await prisma.invoice.findUnique({
			where: {
				id: invoiceId,
			},
		});
		if (!invoice) throw createHttpError(404, 'Invoice not found.');

		return res.status(200).json(invoice);
	} catch (error) {
		next(error);
	}
};

// @desc    Create Invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to create invoices.');

		const { client, industry, totalHoursBilled, amountBilledBAM, invoiceStatus } = req.body;
		if (!client || !industry || !totalHoursBilled || !amountBilledBAM || !invoiceStatus)
			throw createHttpError(400, 'Missing required fields.');

		if (
			typeof client !== 'string' ||
			typeof industry !== 'string' ||
			(typeof totalHoursBilled !== 'number' && typeof totalHoursBilled !== 'string') ||
			(typeof totalHoursBilled === 'number' && totalHoursBilled <= 0) ||
			(typeof totalHoursBilled === 'string' && (isNaN(Number(totalHoursBilled)) || Number(totalHoursBilled) <= 0)) ||
			(typeof amountBilledBAM !== 'number' && typeof amountBilledBAM !== 'string') ||
			(typeof amountBilledBAM === 'number' && amountBilledBAM <= 0) ||
			(typeof amountBilledBAM === 'string' && (isNaN(Number(amountBilledBAM)) || Number(amountBilledBAM) <= 0)) ||
			(invoiceStatus !== InvoiceStatus.Paid &&
				invoiceStatus !== InvoiceStatus.Sent &&
				invoiceStatus !== InvoiceStatus.NotSent)
		)
			throw createHttpError(400, 'Invalid input fields.');

		const invoice = await prisma.invoice.create({
			data: {
				client,
				industry,
				totalHoursBilled: typeof totalHoursBilled === 'string' ? Number(totalHoursBilled) : totalHoursBilled,
				amountBilledBAM: typeof amountBilledBAM === 'string' ? Number(amountBilledBAM) : amountBilledBAM,
				invoiceStatus,
			},
		});

		return res.status(201).json(invoice);
	} catch (error) {
		next(error);
	}
};

// @desc    Update Invoice
// @route   PATCH /api/invoices/:invoiceId
// @access  Private
export const updateInvoice: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to update invoices.');

		const invoiceId = req.params.invoiceId;
		const invoice = await prisma.invoice.findUnique({
			where: {
				id: invoiceId,
			},
		});
		if (!invoice) throw createHttpError(404, 'Invoice not found.');

		const { client, industry, totalHoursBilled, amountBilledBAM, invoiceStatus } = req.body;

		if (
			(client !== undefined && (typeof client !== 'string' || client.length === 0)) ||
			(industry !== undefined && (typeof industry !== 'string' || industry.length === 0)) ||
			(totalHoursBilled !== undefined &&
				((typeof totalHoursBilled !== 'number' && typeof totalHoursBilled !== 'string') ||
					(typeof totalHoursBilled === 'number' && totalHoursBilled <= 0) ||
					(typeof totalHoursBilled === 'string' &&
						(isNaN(Number(totalHoursBilled)) || Number(totalHoursBilled) <= 0)))) ||
			(amountBilledBAM !== undefined &&
				((typeof amountBilledBAM !== 'number' && typeof amountBilledBAM !== 'string') ||
					(typeof amountBilledBAM === 'number' && amountBilledBAM <= 0) ||
					(typeof amountBilledBAM === 'string' && (isNaN(Number(amountBilledBAM)) || Number(amountBilledBAM) <= 0)))) ||
			(invoiceStatus !== undefined &&
				invoiceStatus !== InvoiceStatus.Paid &&
				invoiceStatus !== InvoiceStatus.Sent &&
				invoiceStatus !== InvoiceStatus.NotSent)
		)
			throw createHttpError(400, 'Invalid input fields.');

		const updatedInvoice = await prisma.invoice.update({
			where: {
				id: invoiceId,
			},
			data: {
				client,
				industry,
				totalHoursBilled: typeof totalHoursBilled === 'string' ? Number(totalHoursBilled) : totalHoursBilled,
				amountBilledBAM: typeof amountBilledBAM === 'string' ? Number(amountBilledBAM) : amountBilledBAM,
				invoiceStatus,
			},
		});

		return res.status(200).json(updatedInvoice);
	} catch (error) {
		next(error);
	}
};
// @desc    Delete Invoice
// @route   DELETE /api/invoices/:invoiceId
// @access  Private
export const deleteInvoice: RequestHandler = async (req, res, next) => {
	try {
		const loggedInUser = req.user;
		if (loggedInUser?.role !== Role.Admin) throw createHttpError(403, 'This user is not allowed to delete invoices.');

		const invoiceId = req.params.invoiceId;
		const invoice = await prisma.invoice.findUnique({
			where: {
				id: invoiceId,
			},
		});
		if (!invoice) throw createHttpError(404, 'Invoice not found.');

		await prisma.invoice.delete({
			where: {
				id: invoiceId,
			},
		});

		return res.sendStatus(204);
	} catch (error) {
		next(error);
	}
};
