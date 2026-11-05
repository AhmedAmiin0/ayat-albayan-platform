import { Injectable } from '@nestjs/common';
import { apiPublicOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';
import { allowedHosts, isAllowedTarget } from './short-link.allow';
import { looksLikeShortCode, newShortCode } from './short-link.code';
import { ShortLinksRepo, type ShortLinkRow } from './short-links.repo';
import { ShortLinksSettings } from './short-links.settings';

interface ShortLinkTarget {
  /** What the link is for (teacher_report, classroom, feedback, report_pdf). */
  kind: string;
  /** The thing it points at (a lesson id, a report id): one code per (kind, subject). */
  subject: string;
  url: string;
  /** null = never. */
  expiresAt: Date | null;
}

/**
 * Tries before giving up on a fresh code (a collision of 10 base62 chars is astronomically rare).
 */
const CODE_TRIES = 3;
const httpsBase = (raw: string): boolean => /^https:\/\/[^/\s]+\/(?:[^\s]*\/)?$/.test(raw);

const expired = (row: ShortLinkRow, now: Date): boolean =>
  row.expires_at !== null && Date.parse(row.expires_at) <= now.getTime();

/**
 * The in-house short links (owner 2026-11-05, docs/19 «Short links»): the platform's own instead of
 * the old Vercel redirector. Idempotent per (kind, subject): the same code, its target refreshed.
 */
@Injectable()
export class ShortLinks {
  constructor(
    private readonly repo: ShortLinksRepo,
    private readonly settings: ShortLinksSettings,
  ) {}

  /**
   * The short URL for this target; throws on a target outside the allow-list (no open redirect).
   */
  async forTarget(input: ShortLinkTarget): Promise<string> {
    const env = loadEnv();
    const hosts = allowedHosts([...env.WEB_ORIGIN.split(','), apiPublicOrigin()]);
    if (!isAllowedTarget(input.url, hosts))
      throw new Error(`short link refused: target not allowed (${input.kind})`);
    const key = { kind: input.kind, subject: input.subject };
    const target = { target_url: input.url, expires_at: input.expiresAt?.toISOString() ?? null };
    const row = await this.store({ key, target, tries: CODE_TRIES });
    return `${await this.base()}${row.code}`;
  }

  /** The live target of a code; null when unknown, malformed or expired. */
  async resolve(code: string, now: Date): Promise<string | null> {
    const row = looksLikeShortCode(code) ? await this.repo.byCode(code) : null;
    return row && !expired(row, now) ? row.target_url : null;
  }

  /**
   * «https://<host>/r/»: short_link_base when it is an https base ending in /, else the API's /r/.
   */
  async base(): Promise<string> {
    const raw = (await this.settings.read()).short_link_base.trim();
    return httpsBase(raw) ? raw : `${apiPublicOrigin()}/r/`;
  }

  /** Refresh the existing row, else insert one; a lost race (or a code collision) tries again. */
  private async store(s: {
    key: { kind: string; subject: string };
    target: { target_url: string; expires_at: string | null };
    tries: number;
  }): Promise<ShortLinkRow> {
    const existing = await this.repo.refresh(s.key, s.target);
    if (existing) return existing;
    const made = await this.repo.insert({ ...s.key, ...s.target, code: newShortCode() });
    if (made) return made;
    if (s.tries <= 1) throw new Error('short link: could not store a code');
    return this.store({ ...s, tries: s.tries - 1 });
  }
}
