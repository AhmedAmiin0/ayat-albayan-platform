// The report page's WhatsApp codes (owner 2026-11-06) as a port: the sign-in module (codes, limits,
// pepper) provides it globally under REPORT_CODES, and the report page injects the token. No import
// runs between the two modules, so neither joins the other's module-load cycle.

export const REPORT_CODES = Symbol('REPORT_CODES');

export interface ReportCodes {
  /** Codes can go out: the pepper and the account_code template's send (not the family flag). */
  sendable(): Promise<boolean>;
  /** A code for this report to a phone ON FILE; false = not sent (limits, send). */
  issue(input: { reportId: string; phone: string }): Promise<boolean>;
  /** true once for the newest live code of this report (attempts counted, single use). */
  check(input: { reportId: string; code: string }, now: Date): Promise<boolean>;
  /** 429 too_many_requests past the per-IP / per-report buckets of this step. */
  limit(step: 'request' | 'check', at: { ip: string; identifier: string }): Promise<void>;
  /** LOGIN_CODE_PEPPER (the session cookie's key is derived from it); null = unconfigured. */
  pepper(): string | null;
}
