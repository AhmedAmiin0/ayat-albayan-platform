import { registrationView, type RegistrationCheckQuery, type RegistrationCheckView } from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { WindowCounter } from '../feedback/public/feedback.rate-limit';
import { SalesRegistrationQueries } from './sales-registration.queries';

/** Checks per user per 10 minutes (WindowCounter's default window): plenty for a chat, too few to walk the roll. */
export const REGISTRATION_CHECKS_PER_WINDOW = 60;

/**
 * «التحقق من التسجيل»: is this family / child already a student? Anti-enumeration of THIS route: a name
 * needs 3 letters or digits (schema; wildcards and punctuation do not count), the answer lists at most 10
 * children and only name, code, status and teacher, and each user has REGISTRATION_CHECKS_PER_WINDOW checks
 * per window (429 too_many_requests). Sales already see every student's name / code / status / teacher in
 * «الطلاب» (self.sales_academy, code-only), so revoking the key removes the phone lookup and the button only.
 */
@Injectable()
export class SalesRegistrationService {
  private readonly limit = new WindowCounter(REGISTRATION_CHECKS_PER_WINDOW);

  constructor(private readonly queries: SalesRegistrationQueries) {}

  async check(user: AuthUser, query: RegistrationCheckQuery, now = Date.now()): Promise<RegistrationCheckView> {
    if (!this.limit.allow(user.id, now)) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const rows = query.by === 'phone' ? await this.queries.byPhone(query.phone) : await this.queries.byName(query.q);
    return registrationView(rows);
  }
}
