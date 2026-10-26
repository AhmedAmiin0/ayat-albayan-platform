import { Inject, Injectable, Logger } from '@nestjs/common';
import { CodeSend } from '../../../messaging/whatsapp';
import { CODE_STORE, type CodePurpose, type CodeStore, type Subject } from '../sign-in.ports';
import { SignInSettings } from '../sign-in.settings';
import { expiryOf, hashCode, newCode, sameHash } from './code-crypto';
import { phoneMayCheck, phoneMaySend } from './code-limits';

/** A code to issue: the phone is always one ON FILE for the subject, never a number the caller typed. */
export interface CodeTarget {
  purpose: CodePurpose;
  subject: Subject;
  phone: string;
}

/**
 * Issues and checks the WhatsApp codes (docs/30 §3): HMAC only, TTL and attempts from the settings,
 * single use, the per-phone limits from login_codes. Callers run issue() after answering 202.
 */
@Injectable()
export class CodeIssuer {
  private readonly log = new Logger(CodeIssuer.name);
  /** One issue at a time per phone on this instance, so parallel requests cannot pass the count together. */
  private readonly queues = new Map<string, Promise<boolean>>();

  constructor(
    @Inject(CODE_STORE) private readonly store: CodeStore,
    private readonly send: CodeSend,
    private readonly settings: SignInSettings,
  ) {}

  /** Codes can go out now: the flag, the pepper, the approved template and the open send gate. */
  async available(): Promise<boolean> {
    if (!this.settings.config.pepper || !(await this.settings.read()).family_login_enabled) return false;
    return this.send.available();
  }

  /** false = not sent (unavailable, or the phone is over its limits). Never throws for a send failure. */
  issue(target: CodeTarget): Promise<boolean> {
    const before = this.queues.get(target.phone) ?? Promise.resolve(true);
    const next = before.catch(() => false).then(() => this.issueNow(target, new Date()));
    this.queues.set(target.phone, next);
    void next.finally(() => this.queues.get(target.phone) === next && this.queues.delete(target.phone)).catch(() => undefined);
    return next;
  }

  private async issueNow(target: CodeTarget, now: Date): Promise<boolean> {
    const pepper = this.settings.config.pepper;
    if (!pepper || !phoneMaySend(await this.store.phoneStats(target.phone, now))) return false;
    const values = await this.settings.read();
    const code = newCode();
    const id = await this.store.insert({
      purpose: target.purpose,
      subject: target.subject,
      phone: target.phone,
      hash: hashCode(pepper, { purpose: target.purpose, subject: target.subject, code }),
      maxAttempts: values.login_code_max_attempts,
      expiresAt: expiryOf(now, values.login_code_ttl_minutes),
    });
    const result = await this.send.send({ phone: target.phone, code });
    await this.store.delivered(id, result.status === 'sent' ? null : result.status === 'failed' ? result.error : 'unavailable');
    if (result.status !== 'sent') this.log.warn(`login code ${id} not sent: ${result.status}`);
    return result.status === 'sent';
  }

  /**
   * true once for the newest live code of the subject (purposes given): each try is counted in SQL
   * before the constant-time compare, and a match is spent by compare-and-set (no replay, no race).
   */
  async check(input: { subject: Subject; purposes: readonly CodePurpose[]; code: string }, now = new Date()): Promise<boolean> {
    const pepper = this.settings.config.pepper;
    const row = pepper ? await this.store.latest(input.subject, input.purposes) : null;
    if (!pepper || !row || !phoneMayCheck(await this.store.phoneStats(row.phone, now))) return false;
    const stored = await this.store.take(row.id);
    if (!stored || !sameHash(stored, hashCode(pepper, { purpose: row.purpose, subject: input.subject, code: input.code }))) return false;
    return this.store.spend(row.id);
  }
}
