import { Types } from 'mongoose';
import { UserRole } from '../models/user';

interface GetUsersRes {
	id: Types.ObjectId;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	image?: string;
}

interface GetUserByIdParams {
	userId: string;
}

interface GetUserByIdRes {
	id: Types.ObjectId;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	image?: string;
}

interface RegisterUserReq {
	email?: string;
	password?: string;
	firstName?: string;
	lastName?: string;
	role?: UserRole;
}

interface LoginUserReq {
	email?: string;
	password?: string;
	rememberMe?: boolean;
}

interface DeleteUserParams {
	userId: string;
}

interface DeleteUserReq {
	userId: string;
}

export {
	GetUsersRes,
	GetUserByIdParams,
	GetUserByIdRes,
	RegisterUserReq,
	LoginUserReq,
	DeleteUserParams,
	DeleteUserReq,
};
