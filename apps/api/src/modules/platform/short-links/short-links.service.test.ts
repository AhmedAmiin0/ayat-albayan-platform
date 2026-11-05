import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { ShortLinksRepo, ShortLinkRow } from './short-links.repo';
import { ShortLinks } from './short-links.service';
import { ShortLinksSettings } from './short-links.settings';

const NOW = new Date('2026-11-05T12:00:00Z');
const row = (over: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  code: 'Ab12Cd34Ef',
  target_url: 'https://app.example.com/teacher-report/t',
  kind: 'teacher_report',
  subject: 'l1',
  created_at: NOW.toISOString(),
  expires_at: null,
  ...over,
});

function setup(base = '') {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example.com,https://admin.example.com');
  vi.stubEnv('API_PUBLIC_URL', 'https://api.example.com');
  const repo = {
    byCode: vi.fn(),
    refresh: vi.fn(async () => null),
    insert: vi.fn(async (r: ShortLinkRow) => r),
  };
  const links = new ShortLinks(
    repo as unknown as ShortLinksRepo,
    readerOf(ShortLinksSettings, { short_link_base: base }),
  );
  return { links, repo };
}
const target = {
  kind: 'teacher_report',
  subject: 'l1',
  url: 'https://app.example.com/teacher-report/t',
  expiresAt: NOW,
};

describe('ShortLinks.forTarget / resolve', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('a new (kind, subject) gets a fresh code on the API’s /r/', async () => {
    const { links, repo } = setup();
    const url = await links.forTarget(target);
    expect(url).toMatch(/^https:\/\/api\.example\.com\/r\/[A-Za-z0-9]{10}$/);
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'teacher_report',
        subject: 'l1',
        expires_at: NOW.toISOString(),
      }),
    );
  });

  it('idempotent: the same (kind, subject) keeps its code, its target refreshed', async () => {
    const { links, repo } = setup();
    repo.refresh.mockResolvedValue(row() as never);
    expect(
      await links.forTarget({ ...target, url: 'https://app.example.com/teacher-report/new' }),
    ).toBe('https://api.example.com/r/Ab12Cd34Ef');
    expect(repo.refresh).toHaveBeenCalledWith(
      { kind: 'teacher_report', subject: 'l1' },
      { target_url: 'https://app.example.com/teacher-report/new', expires_at: NOW.toISOString() },
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('a lost insert race reads the winner’s row; a short domain is one setting', async () => {
    const { links, repo } = setup('https://s.example.com/');
    repo.insert.mockResolvedValueOnce(null as never);
    repo.refresh.mockResolvedValueOnce(null).mockResolvedValueOnce(row() as never);
    expect(await links.forTarget(target)).toBe('https://s.example.com/Ab12Cd34Ef');
  });

  it('refuses a target outside the allow-list before any write', async () => {
    const { links, repo } = setup();
    for (const url of [
      'https://evil.example.org/x',
      'http://app.example.com/x',
      'javascript:alert(1)',
    ]) {
      await expect(links.forTarget({ ...target, url })).rejects.toThrow('target not allowed');
    }
    expect(repo.refresh).not.toHaveBeenCalled();
  });

  it('resolve: live target; unknown, malformed or expired → null', async () => {
    const { links, repo } = setup();
    repo.byCode.mockResolvedValue(row({ expires_at: '2026-11-05T13:00:00Z' }));
    expect(await links.resolve('Ab12Cd34Ef', NOW)).toBe('https://app.example.com/teacher-report/t');
    expect(await links.resolve('Ab12Cd34Ef', new Date('2026-11-05T13:00:00Z'))).toBeNull();
    repo.byCode.mockResolvedValue(null);
    expect(await links.resolve('Ab12Cd34Ef', NOW)).toBeNull();
    repo.byCode.mockClear();
    expect(await links.resolve('../etc', NOW)).toBeNull();
    expect(repo.byCode).not.toHaveBeenCalled();
  });
});
