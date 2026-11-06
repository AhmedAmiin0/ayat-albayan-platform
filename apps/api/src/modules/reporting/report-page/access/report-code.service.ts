import type { ReportAccessView, ReportCodeTarget, ReportPageView } from '@ab/shared';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { REPORT_CODES, type ReportCodes } from '@/common/http/report-codes';
import {
  ReportPageService,
  type PageFound,
} from '@/modules/reporting/report-page/report-page.service';
import { phoneChoices, phoneOf } from './report-phones';
import {
  REPORT_SESSION_SECONDS,
  reportSessionCookie,
  reportSessionToken,
  sessionFromCookie,
  validReportSession,
} from './report-session';

const unauthorized = (code: string) => new UnauthorizedException({ code, message: code });
const invalidCode = () => unauthorized('invalid_code');
const codeRequired = () => unauthorized('code_required');
const unavailable = () =>
  new HttpException(
    { code: 'codes_unavailable', message: 'codes_unavailable' },
    HttpStatus.SERVICE_UNAVAILABLE,
  );

interface Call {
  publicId: string;
  ip: string;
}

/**
 * The report page for a viewer who is not signed in (owner 2026-11-06): a WhatsApp code to the
 * phone ON FILE of the lesson's teacher or the student's family (sign-in/codes through
 * REPORT_CODES: the same per-phone limits, pepper, expiry and account_code template; purpose
 * report_view, subject = the report), then a 30-minute HttpOnly cookie bound to THIS report only.
 * The per-IP and per-report buckets come first on every code step; the site-wide breaker sits in
 * the code issuer.
 */
@Injectable()
export class ReportCodeService {
  private readonly log = new Logger(ReportCodeService.name);

  constructor(
    private readonly pages: ReportPageService,
    @Inject(REPORT_CODES) private readonly codes: ReportCodes,
  ) {}

  /** Where a code may go, masked; 404 report_not_found for an unknown id or a draft. */
  async access(publicId: string): Promise<ReportAccessView> {
    const found = await this.find(publicId);
    return { available: await this.codes.sendable(), to: phoneChoices(sourceOf(found)) };
  }

  /** 202 whatever happens next: the send runs after the answer (limits, one at a time). */
  async request(call: Call & { to: ReportCodeTarget }): Promise<void> {
    await this.codes.limit('request', { ip: call.ip, identifier: bucket(call.publicId) });
    const found = await this.find(call.publicId);
    if (!(await this.codes.sendable())) throw unavailable();
    const phone = phoneOf(sourceOf(found), call.to);
    if (!phone) return;
    const failed = (e: unknown) => this.log.warn(`report code not sent: ${String(e)}`);
    void this.codes.issue({ reportId: found.row.id, phone }).catch(failed);
  }

  /** The Set-Cookie of a verified viewer; 401 invalid_code (one answer for every failure). */
  async verify(call: Call & { code: string }, now = new Date()): Promise<string> {
    await this.codes.limit('check', { ip: call.ip, identifier: bucket(call.publicId) });
    const found = await this.find(call.publicId);
    const pepper = this.codes.pepper();
    const check = { reportId: found.row.id, code: call.code };
    if (!pepper || !(await this.codes.check(check, now))) throw invalidCode();
    const token = reportSessionToken({ pepper, reportId: found.row.id, now });
    return reportSessionCookie(call.publicId, token);
  }

  /** The page for a viewer holding this report's cookie; 401 code_required otherwise. */
  async view(
    input: { publicId: string; cookie: string | undefined },
    now = new Date(),
  ): Promise<ReportPageView> {
    const found = await this.find(input.publicId);
    const pepper = this.codes.pepper() ?? '';
    const token = sessionFromCookie(input.cookie);
    const valid = validReportSession({ pepper, reportId: found.row.id, token, now });
    if (!pepper || !valid) throw codeRequired();
    // The files' signed URLs last no longer than the session.
    return this.pages.view(found, REPORT_SESSION_SECONDS);
  }

  private find(publicId: string): Promise<PageFound> {
    return this.pages.find({ by: 'public', value: publicId });
  }
}

const bucket = (publicId: string): string => `report:${publicId}`;
const sourceOf = (found: PageFound) => ({ facts: found.facts, sent: found.row.sent_at !== null });
