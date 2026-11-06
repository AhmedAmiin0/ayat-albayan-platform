import { createHmac, timingSafeEqual } from 'node:crypto';

/** How long a verified viewer reads the report without a new code. */
export const REPORT_SESSION_SECONDS = 30 * 60;
const COOKIE = 'ab_report';

/** The session key, derived from the login-code pepper (never the pepper itself). */
const keyOf = (pepper: string): Buffer =>
  createHmac('sha256', pepper).update('report-session-v1').digest();

const sign = (input: { pepper: string; reportId: string; exp: number }): string =>
  createHmac('sha256', keyOf(input.pepper))
    .update(`report|${input.reportId}|${input.exp}`)
    .digest('base64url');

/** `<exp>.<sig>`: bound to ONE report (its uuid signed, never shown) until exp (unix seconds). */
export function reportSessionToken(input: { pepper: string; reportId: string; now: Date }): string {
  const exp = Math.floor(input.now.getTime() / 1000) + REPORT_SESSION_SECONDS;
  return `${exp}.${sign({ pepper: input.pepper, reportId: input.reportId, exp })}`;
}

const TOKEN = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/;

interface SessionCheck {
  pepper: string;
  reportId: string;
  token: string;
  now: Date;
}

/** Constant-time compare of two signatures of any length. */
const sameSig = (got: Buffer, want: Buffer): boolean =>
  got.length === want.length && timingSafeEqual(got, want);

/** true only for an unexpired token signed for this report. */
export function validReportSession(input: SessionCheck): boolean {
  const [, expText = '0', sig = ''] = TOKEN.exec(input.token) ?? [];
  const exp = Number(expText);
  const want = Buffer.from(sign({ pepper: input.pepper, reportId: input.reportId, exp }));
  return exp * 1000 > input.now.getTime() && sameSig(Buffer.from(sig), want);
}

/** HttpOnly, this report's public routes only, 30 minutes; same-site with the web app (Lax). */
export const reportSessionCookie = (publicId: string, token: string): string =>
  `${COOKIE}=${token}; Path=/public/report-pages/${publicId}; Max-Age=${REPORT_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;

/** The session token from a Cookie header, or ''. */
export const sessionFromCookie = (header: string | undefined): string =>
  /(?:^|;\s*)ab_report=([^;]+)/.exec(header ?? '')?.[1] ?? '';
