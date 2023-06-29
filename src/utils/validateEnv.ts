import { cleanEnv } from 'envalid';
import { port, str } from 'envalid/dist/validators';

export default cleanEnv(process.env, {
	NODE_ENV: str(),
	DATABASE_URI: str(),
	PORT: port(),
	ACCESS_TOKEN_SECRET: str(),
	REFRESH_TOKEN_SECRET: str(),
	TOKEN_OBJ_SECRET: str(),
	CLIENT_URL: str(),
	EMAIL_ADDRESS: str(),
	EMAIL_PASSWORD: str(),
});
