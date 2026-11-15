import type { PortalRoomLink } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  CLASSROOM_WEB_ORIGIN,
  FAMILY_JOIN_SECRET,
} from '@/modules/teaching/classroom/classroom.config';
import {
  type FamilyJoin,
  familyJoinExpiry,
  signFamilyJoin,
  verifyFamilyJoin,
} from './family-join.token';

const MS = 1000;

/**
 * The family app's browser link of ONE lesson (docs/50 §2, §7): ${web}/join/<signed token>, which
 * the guest page (/join/:linkToken) takes like a random link token. Issued and read here only.
 */
@Injectable()
export class FamilyJoinLinks {
  constructor(
    @Inject(FAMILY_JOIN_SECRET) private readonly secret: string | null,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  /** The link until the room closes (closesAt). 503 family_link_not_configured without a secret. */
  issue(input: { lessonId: string; studentId: string; closesAt: string }): PortalRoomLink {
    const { secret } = this;
    if (secret === null) {
      const code = 'family_link_not_configured';
      throw new HttpException({ code, message: code }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const { lessonId, studentId } = input;
    const exp = familyJoinExpiry(input.closesAt);
    const token = signFamilyJoin(secret, { lessonId, studentId, exp });
    return { url: `${this.origin}/join/${token}`, expires_at: new Date(exp * MS).toISOString() };
  }

  /** The (lesson, student) of a valid, unexpired token; null otherwise (and with no secret). */
  verify(token: string, now: Date): FamilyJoin | null {
    return this.secret === null ? null : verifyFamilyJoin(this.secret, token, now);
  }
}
