import {
  registrationCheckViewSchema,
  registrationView,
  type RegistrationCheckQuery,
  type RegistrationCheckView,
} from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { WindowCounter } from '@/modules/teaching/feedback/public/feedback.rate-limit';
import { SalesRegistrationRepo } from './sales-registration.repo';

/** Checks per user per 10 minutes (WindowCounter's default window): plenty for a chat, too few to walk the roll. */
export const REGISTRATION_CHECKS_PER_WINDOW = 60;

/** Anti-enumeration: 3+ letters, at most 10 children, few fields, rate-limited per user. */
@Injectable()
export class SalesRegistrationService {
  private readonly limit = new WindowCounter(REGISTRATION_CHECKS_PER_WINDOW);

  constructor(private readonly queries: SalesRegistrationRepo) {}

  async check(user: AuthUser, query: RegistrationCheckQuery, now = Date.now()): Promise<RegistrationCheckView> {
    if (!this.limit.allow(user.id, now)) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const rows = query.by === 'phone' ? await this.queries.byPhone(query.phone) : await this.queries.byName(query.q);
    return asResponse(registrationCheckViewSchema, registrationView(rows));
  }
}
