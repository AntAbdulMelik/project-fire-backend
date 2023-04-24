import { InferSchemaType, Schema, model } from 'mongoose';

enum ProjectType {
	Fixed = 'fixed',
	OnGoing = 'on-going',
}

enum SalesChannel {
	Online = 'online',
	InPerson = 'in-person',
	Referral = 'referral',
	Other = 'other',
}

const projectSchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	description: {
		type: String,
		required: true,
	},
	startDate: {
		type: Date,
		required: true,
	},
	endDate: {
		type: Date,
		required: true,
	},
	actualEndDate: {
		type: Date,
	},
	projectType: {
		type: String,
		enum: Object.values(ProjectType),
		required: true,
	},
	hourlyRate: {
		type: Number,
		required: true,
	},
	projectValueBAM: {
		type: Number,
		required: true,
	},
	salesChannel: {
		type: String,
		enum: Object.values(SalesChannel),
		required: true,
	},
	finished: {
		type: Boolean,
		default: false,
	},
});

type Project = InferSchemaType<typeof projectSchema>;

const ProjectModel = model<Project>('Project', projectSchema);

export { ProjectModel, ProjectType, SalesChannel };
