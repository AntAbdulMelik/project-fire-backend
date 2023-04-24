import { Request } from 'express';
import createHttpError from 'http-errors';
import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({
	destination: (
		req: Request,
		file: Express.Multer.File,
		callback: (error: Error | null, destination: string) => void
	) => {
		const dir = './src/uploads/';
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
		callback(null, dir);
	},
	filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
		callback(null, file.fieldname + '-' + Date.now() + '-' + file.originalname);
	},
});

const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
		callback(null, true);
	} else {
		callback(createHttpError(400, 'Invalid file type. Only JPEG and PNG files are allowed.'));
	}
};

// Limit is 5MB
const limits = {
	fileSize: 1024 * 1024 * 5,
};

const upload = multer({
	storage,
	fileFilter,
	limits,
});

const imageUpload = upload.single('image');

export default imageUpload;
