import { Injectable } from '@nestjs/common';
import type { ReportCodes } from '@/common/http/report-codes';
import { SignInSettings } from '@/modules/people/sign-in/sign-in.settings';
import { CodeIssuer } from './code-issuer';
import { SignInLimits } from './code-limits';

const subjectOf = (reportId: string) => ({ kind: 'report' as const, id: reportId });

/**
 * The report page's codes on the sign-in machinery (owner 2026-11-06): purpose report_view,
 * subject the report; the same HMAC, expiry, attempts, per-phone limits, breaker and template.
 */
@Injectable()
export class ReportCodesAdapter implements ReportCodes {
  constructor(
    private readonly codes: CodeIssuer,
    private readonly limits: SignInLimits,
    private readonly settings: SignInSettings,
  ) {}

  sendable(): Promise<boolean> {
    return this.codes.sendable();
  }

  issue(input: { reportId: string; phone: string }): Promise<boolean> {
    const target = { purpose: 'report_view' as const, subject: subjectOf(input.reportId) };
    return this.codes.issue({ ...target, phone: input.phone });
  }

  check(input: { reportId: string; code: string }, now: Date): Promise<boolean> {
    const query = { subject: subjectOf(input.reportId), purposes: ['report_view' as const] };
    return this.codes.check({ ...query, code: input.code }, now);
  }

  limit(step: 'request' | 'check', at: { ip: string; identifier: string }): Promise<void> {
    return this.limits.assert(step, at);
  }

  pepper(): string | null {
    return this.settings.config.pepper;
  }
}
