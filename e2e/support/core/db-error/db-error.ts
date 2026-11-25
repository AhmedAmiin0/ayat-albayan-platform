import { dbErrorSchema } from './db-error.schemas.ts';

/** A rejected query's postgres fields; anything else thrown reads as an empty error. */
export const dbError = (e: unknown) => dbErrorSchema.catch({}).parse(e);

export const errorCode = (e: unknown) => dbError(e).code;

export const errorMessage = (e: unknown) => dbError(e).message;
