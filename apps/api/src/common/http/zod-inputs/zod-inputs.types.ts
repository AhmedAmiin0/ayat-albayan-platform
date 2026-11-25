import type { HttpException } from '@nestjs/common';

/** The route's own error for a bad param (404 list_not_found, 400 invalid_phone…). */
export type ParamFailure = () => HttpException;
