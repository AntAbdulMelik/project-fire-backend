import mongoose from 'mongoose';

import app from './app';
import env from './utils/validate-env';

const port = env.PORT;

mongoose
	.connect(env.CONNECTION_STRING)
	.then(() => {
		app.listen(port, () => {
			console.log(`Server running on port ${port}`);
		});
	})
	.catch(console.error);
