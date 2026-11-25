import { createHash } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import type { LinkVisitor, ShortLinkCodes } from '@/common/http/short-link-codes';
import { CodeIssuer } from './code-issuer';
import { SignInLimits } from './code-limits';

/**
 * login_codes.subject_id of one visitor of one link: a uuid-shaped digest of (code, phone), so a
 * code sent for one link or phone never opens another (the subject is never a real row).
 */
export function visitorSubjectId(v: LinkVisitor): string {
  const h = createHash('sha256').update(`short_link|${v.code}|${v.phone}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const subjectOf = (v: LinkVisitor) => ({ kind: 'short_link' as const, id: visitorSubjectId(v) });
const PURPOSE = 'short_link' as const;

/**
 * The short-link gate's codes on the sign-in machinery: purpose short_link,
 * subject = (link, phone); the same HMAC, expiry, attempts, per-phone limits, breaker, template.
 */
@Injectable()
export class ShortLinkCodesAdapter implements ShortLinkCodes {
  constructor(
    @Inject(CodeIssuer) private readonly codes: CodeIssuer,
    @Inject(SignInLimits) private readonly limits: SignInLimits,
  ) {}

  sendable(): Promise<boolean> {
    return this.codes.sendable();
  }

  issue(visitor: LinkVisitor): Promise<boolean> {
    return this.codes.issue({
      purpose: PURPOSE,
      subject: subjectOf(visitor),
      phone: visitor.phone,
    });
  }

  check(visitor: LinkVisitor & { otp: string }, now: Date): Promise<boolean> {
    const query = { subject: subjectOf(visitor), purposes: [PURPOSE], phone: visitor.phone };
    return this.codes.check({ ...query, code: visitor.otp }, now);
  }

  limit(step: 'request' | 'check', at: { ip: string; identifier: string }): Promise<void> {
    return this.limits.assert(step, at);
  }
}
