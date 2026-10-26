import type { RuleError } from '@ab/shared';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

/** PATCH /admin/notifications/:key refusals (rules.types.ts RULE_ERRORS), worded like the gate routes. */
export function ruleError(code: Exclude<RuleError, 'confirmation_required'>, detail?: string): HttpException {
  const body = detail ? { code, message: code, detail } : { code, message: code };
  return new HttpException(body, HttpStatus.UNPROCESSABLE_ENTITY);
}

/** 428: an essential row switched off without the typed confirmation (ESSENTIAL_OFF_TEXT). */
export const ruleConfirmationRequired = (): HttpException =>
  new HttpException({ code: 'confirmation_required', message: 'confirmation_required' }, HttpStatus.PRECONDITION_REQUIRED);

/** 404: not a catalogue key. */
export const unknownRule = (): HttpException => new NotFoundException({ code: 'unknown_notification', message: 'unknown_notification' });
