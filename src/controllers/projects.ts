import { RequestHandler } from 'express';
import createHttpError from 'http-errors';

import { ProjectModel } from '../models/project';
import { UserModel, UserRole } from '../models/user';
import * as ProjectsInterfaces from '../interfaces/projects';

export const getProjects: RequestHandler<unknown, ProjectsInterfaces.GetProjectsRes[], unknown, unknown> = async (
	req,
	res,
	next
) => {
	try {
		const projects = await ProjectModel.find();
		res.status(200).json(projects);
	} catch (error) {
		next(error);
	}
};

export const getProjectById: RequestHandler<
	ProjectsInterfaces.GetProjectByIdParams,
	ProjectsInterfaces.GetProjectByIdRes,
	unknown,
	unknown
> = async (req, res, next) => {
	try {
		const projectId = req.params.projectId;
		const project = await ProjectModel.findById(projectId);

		if (!project) throw createHttpError(404, 'Project not found.');

		return res.status(200).json(project);
	} catch (error) {
		next(error);
	}
};

export const getProjectsInfo: RequestHandler = async (req, res, next) => {
	try {
		const totalProjects = await ProjectModel.countDocuments();
		const totalValue = await ProjectModel.aggregate([{ $group: { _id: null, total: { $sum: '$projectValueBAM' } } }]);
		const averageValue = await ProjectModel.aggregate([
			{ $group: { _id: null, average: { $avg: '$projectValueBAM' } } },
		]);
		const averageRate = await ProjectModel.aggregate([{ $group: { _id: null, average: { $avg: '$hourlyRate' } } }]);
		const salesChannelPercentage = await ProjectModel.aggregate([
			{
				$group: {
					_id: '$salesChannel',
					count: { $sum: 1 },
				},
			},
			{
				$project: {
					_id: 0,
					salesChannel: '$_id',
					percentage: {
						$multiply: [{ $divide: ['$count', totalProjects] }, 100],
					},
				},
			},
		]);
		const projectTypeCount = await ProjectModel.aggregate([
			{
				$group: {
					_id: '$projectType',
					count: { $sum: 1 },
				},
			},
			{
				$project: {
					_id: 0,
					projectType: '$_id',
					count: 1,
				},
			},
		]);

		res.json({
			totalProjects,
			totalValue: totalValue[0].total,
			averageValue: averageValue[0].average,
			averageHourlyRate: averageRate[0].average,
			salesChannelPercentage,
			projectTypeCount,
		});
	} catch (error) {
		next(error);
	}
};

export const createProject: RequestHandler<unknown, unknown, ProjectsInterfaces.CreateProjectReq, unknown> = async (
	req,
	res,
	next
) => {
	try {
		const userId = req.body.userId;
		const user = await UserModel.findById(userId);

		if (!user) throw createHttpError(404, 'User not found.');

		if (user.role !== UserRole.Admin) {
			throw createHttpError(403, 'This user is not allowed to create a project.');
		}

		const {
			name,
			description,
			startDate,
			endDate,
			actualEndDate,
			projectType,
			hourlyRate,
			projectValueBAM,
			salesChannel,
			finished,
		} = req.body;

		if (
			!name ||
			!description ||
			!startDate ||
			!endDate ||
			!projectType ||
			!hourlyRate ||
			!projectValueBAM ||
			!salesChannel
		)
			throw createHttpError(400, 'Missing required fields.');

		const existingProject = await ProjectModel.findOne({ name });
		if (existingProject) throw createHttpError(409, 'Project already exists.');

		const project = await ProjectModel.create({
			name,
			description,
			startDate,
			endDate,
			actualEndDate,
			projectType,
			hourlyRate,
			projectValueBAM,
			salesChannel,
			finished,
		});

		return res.status(201).json(project);
	} catch (error) {
		next(error);
	}
};

export const deleteProject: RequestHandler<
	ProjectsInterfaces.DeleteProjectParams,
	unknown,
	ProjectsInterfaces.DeleteProjectReq,
	unknown
> = async (req, res, next) => {
	try {
		const projectId = req.params.projectId;
		const project = await ProjectModel.findById(projectId);

		if (!project) throw createHttpError(404, 'Project not found.');

		const userId = req.body.userId;
		const user = await UserModel.findById(userId);

		if (!user) throw createHttpError(404, 'User not found.');

		if (user.role !== UserRole.Admin) {
			throw createHttpError(403, 'You are not authorized to delete any project.');
		}

		await project.deleteOne();

		return res.status(200).json({ message: 'Project deleted successfully.' });
	} catch (error) {
		next(error);
	}
};
