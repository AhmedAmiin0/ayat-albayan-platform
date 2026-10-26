import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import type { AuditEntry, AuditService } from '../../../common/audit/audit.service';
import type { SettingsService } from '../../../common/settings/settings.service';
import type { CodeSend } from '../../messaging/whatsapp';
import type { CodePurpose, CodeStore, LiveCode, NewCode, PhoneStats, Subject } from './sign-in.ports';
import { SignInSettings } from './sign-in.settings';

// In-memory ports of the sign-in flows (docs/30): the SQL semantics of login_code_take / _spend.

interface StoredCode extends NewCode {
  id: string;
  attempts: number;
  usedAt: Date | null;
  createdAt: Date;
  sendError: string | null;
}

export class FakeCodes implements CodeStore {
  readonly rows: StoredCode[] = [];
  now = () => new Date();

  async insert(row: NewCode): Promise<string> {
    const id = `code-${this.rows.length + 1}`;
    this.rows.push({ ...row, id, attempts: 0, usedAt: null, createdAt: this.now(), sendError: null });
    return id;
  }

  async latest(subject: Subject, purposes: readonly CodePurpose[]): Promise<LiveCode | null> {
    const mine = this.rows.filter((r) => r.subject.kind === subject.kind && r.subject.id === subject.id && purposes.includes(r.purpose));
    const row = mine.at(-1);
    return row ? { id: row.id, purpose: row.purpose, phone: row.phone } : null;
  }

  async take(id: string): Promise<string | null> {
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.usedAt || row.expiresAt <= this.now() || row.attempts >= row.maxAttempts) return null;
    row.attempts += 1;
    return row.hash;
  }

  async spend(id: string): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.usedAt) return false;
    row.usedAt = this.now();
    return true;
  }

  async delivered(id: string, error: string | null): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.sendError = error;
  }

  async phoneStats(phone: string, now: Date): Promise<PhoneStats> {
    const day = this.rows.filter((r) => r.phone === phone && now.getTime() - r.createdAt.getTime() < 24 * 3600_000);
    return {
      sentLast15Min: day.filter((r) => now.getTime() - r.createdAt.getTime() < 15 * 60_000).length,
      sentLastDay: day.length,
      failedLastDay: day.reduce((n, r) => n + r.attempts - (r.usedAt ? 1 : 0), 0),
    };
  }
}

/** The WhatsApp side: every code that would have gone out, by phone. */
export class FakeCodeSend {
  readonly sent: { phone: string; code: string }[] = [];
  open = true;

  async available(): Promise<boolean> {
    return this.open;
  }

  async send(input: { phone: string; code: string }): Promise<{ status: 'sent' } | { status: 'unavailable' }> {
    if (!this.open) return { status: 'unavailable' };
    this.sent.push(input);
    return { status: 'sent' };
  }

  lastTo(phone: string): string {
    const hit = [...this.sent].reverse().find((s) => s.phone === phone);
    if (!hit) throw new Error(`no code sent to ${phone}`);
    return hit.code;
  }

  asPort(): CodeSend {
    return this as unknown as CodeSend;
  }
}

export class FakeAudit {
  readonly entries: AuditEntry[] = [];

  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  asPort(): AuditService {
    return this as unknown as AuditService;
  }
}

export const PEPPER = 'test-pepper-0123456789-0123456789-abcdef';

/** SignInSettings over fixed values (family_login_enabled on unless told otherwise). */
export function fakeSettings(over: Partial<AcademySettings> = {}, pepper: string | null = PEPPER): SignInSettings {
  const store = { all: async () => ({ ...SETTING_DEFAULTS, family_login_enabled: true, ...over }) } as unknown as SettingsService;
  return new SignInSettings(store, { pepper, passwordMinLength: 8, supabaseUrl: 'http://localhost', signInKey: 'k' });
}
