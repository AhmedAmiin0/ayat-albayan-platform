import { HttpException, type HttpStatus } from '@nestjs/common';

/** Domain error body `{ code, message: code, ...details }` (docs/10 §3); clients switch on `code`. */
export function domainError(status: HttpStatus, code: string, details: object = {}): HttpException {
  return new HttpException({ code, message: code, ...details }, status);
}
