import { ProjectType, SalesChannel } from '../models/project';

interface GetProjectsRes {
	name?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date;
	actualEndDate?: Date;
	projectType?: ProjectType;
	hourlyRate?: number;
	projectValueBAM?: number;
	salesChannel?: SalesChannel;
	finished?: boolean;
}

interface GetProjectsQueryParams {
	name?: string;
	startDate?: Date;
	endDate?: Date;
	projectType?: ProjectType;
	salesChannel?: SalesChannel;
}

interface GetProjectByIdParams {
	projectId: string;
}

interface GetProjectByIdRes {
	name?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date;
	actualEndDate?: Date;
	projectType?: ProjectType;
	hourlyRate?: number;
	projectValueBAM?: number;
	salesChannel?: SalesChannel;
	finished?: boolean;
}

interface CreateProjectReq {
	userId: string;
	name?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date;
	actualEndDate?: Date;
	projectType?: ProjectType;
	hourlyRate?: number;
	projectValueBAM?: number;
	salesChannel?: SalesChannel;
	finished?: boolean;
}

interface DeleteProjectParams {
	projectId: string;
}

interface DeleteProjectReq {
	userId: string;
}

export {
	GetProjectsRes,
	GetProjectsQueryParams,
	GetProjectByIdParams,
	GetProjectByIdRes,
	CreateProjectReq,
	DeleteProjectParams,
	DeleteProjectReq,
};
