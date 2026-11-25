// The managed short links' WhatsApp codes (docs/19) as a port, like REPORT_CODES:
// the sign-in module (codes, limits, pepper, account_code template) provides it globally, and the
// short-link gate injects the token. No import runs between the two modules.

export const SHORT_LINK_CODES = Symbol('SHORT_LINK_CODES');

/** One visitor of one link: the code is bound to both (another link or phone never opens). */
export interface LinkVisitor {
  code: string;
  phone: string;
}

export interface ShortLinkCodes {
  /** Codes can go out: the pepper and the account_code template's send (no family flag). */
  sendable(): Promise<boolean>;
  /** A code to this phone for this link; false = not sent (limits, send). */
  issue(visitor: LinkVisitor): Promise<boolean>;
  /** true once for the newest live code of this visitor (attempts counted, single use). */
  check(visitor: LinkVisitor & { otp: string }, now: Date): Promise<boolean>;
  /** 429 too_many_requests past the per-IP / per-identifier buckets of this step. */
  limit(step: 'request' | 'check', at: { ip: string; identifier: string }): Promise<void>;
}
