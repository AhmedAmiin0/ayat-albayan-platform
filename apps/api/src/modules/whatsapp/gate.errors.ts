import { HttpException, HttpStatus } from '@nestjs/common';

/** 428: turning a gate switch ON without the exact confirmation text (docs/26 §2f). */
export const confirmationRequired = (): HttpException =>
  new HttpException({ code: 'confirmation_required', message: 'confirmation_required' }, HttpStatus.PRECONDITION_REQUIRED);
