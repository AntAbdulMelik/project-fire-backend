import { Currency } from '@prisma/client';

export const excludeUserInfo = <User, Key extends keyof User>(user: User, keys: Key[]): Omit<User, Key> => {
	return keys.reduce(
		(result, key) => {
			delete result[key];
			return result;
		},
		{ ...user }
	);
};

export const excludeExpenseInfo = <Expense, Key extends keyof Expense>(
	expense: Expense,
	keys: Key[]
): Omit<Expense, Key> => {
	return keys.reduce(
		(result, key) => {
			delete result[key];
			return result;
		},
		{ ...expense }
	);
};

export const getEmployeeSalaryInBAM = (salary: number, currency: string) => {
	let conversionFactor = 1;
	if (currency === Currency.USD) conversionFactor = 1.78;
	else if (currency === Currency.EUR) conversionFactor = 1.95;
	return salary * conversionFactor;
};
