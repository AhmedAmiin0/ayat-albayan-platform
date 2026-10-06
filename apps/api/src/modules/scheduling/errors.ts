import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';

type Details = Record<string, unknown>;

// Domain errors carry both keys, `{ code, message: code, …details }`; clients switch on `code`
// (docs/10 §3). The 400 validation error keeps `{ message: 'validation_failed', issues }`.

export const conflict = (code: string, details: Details = {}) =>
  new ConflictException({ code, message: code, ...details });

export const badRequest = (code: string, details: Details = {}) =>
  new BadRequestException({ code, message: code, ...details });

export const forbidden = (code: string, details: Details = {}) =>
  new ForbiddenException({ code, message: code, ...details });

export const notFound = (code: string) => new NotFoundException({ code, message: code });

/** The `code` of an HttpException body, if it has one. */
export function errorCode(e: unknown): string | undefined {
  if (!(e instanceof HttpException)) return undefined;
  const body: unknown = e.getResponse();
  if (typeof body !== 'object' || body === null || !('code' in body)) return undefined;
  return typeof body.code === 'string' ? body.code : undefined;
}
