import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
	swaggerDefinition: {
		info: {
			title: 'Project Fire API',
			description: 'Documentation for project fire API',
			version: '1.0.0',
			contact: {
				name: 'Ant Colony',
			},
			servers: [`http://localhost:${process.env.PORT}`],
		},
	},
	apis: ['./src/docs/*.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

export default swaggerDocs;
