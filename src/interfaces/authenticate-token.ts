interface DecodedToken {
	userId: string;
}

interface AuthenticatedRequest extends Request {
	userId: string;
}

export { DecodedToken, AuthenticatedRequest };
