import { describe, expect, it, vi } from 'vitest';
import type { ShortLinksSettings } from '@/modules/platform/short-links';
import type { LinkExpiryRepo } from './expiry.repo';
import { LinkExpiryJob } from './expiry.job';
import { LinkExpiry, purgeCutoff } from './expiry.service';

const NOW = new Date('2026-11-17T12:00:00Z');

/** An in-memory short_links: expire / purge by cutoff, as the repo's SQL does. */
function world() {
  const links = [
    { code: 'old', kind: 'managed', status: 'expired', expires_at: '2026-10-01T00:00:00Z' },
    { code: 'due', kind: 'managed', status: 'active', expires_at: '2026-11-17T11:00:00Z' },
    { code: 'live', kind: 'managed', status: 'active', expires_at: '2026-11-20T00:00:00Z' },
    { code: 'sys', kind: 'teacher_report', status: 'active', expires_at: '2026-01-01T00:00:00Z' },
  ];
  const repo = {
    expire: vi.fn(async (now: Date) => {
      const due = links.filter(
        (l) =>
          l.kind === 'managed' &&
          l.status === 'active' &&
          Date.parse(l.expires_at) <= now.getTime(),
      );
      due.forEach((l) => (l.status = 'expired'));
      return due.length;
    }),
    purge: vi.fn(async (cutoff: Date) => {
      const gone = links.filter(
        (l) => l.kind === 'managed' && Date.parse(l.expires_at) < cutoff.getTime(),
      );
      gone.forEach((l) => links.splice(links.indexOf(l), 1));
      return gone.length;
    }),
  };
  const settings = { read: async () => ({ short_link_purge_days: 30 }) };
  const expiry = new LinkExpiry(
    repo as unknown as LinkExpiryRepo,
    settings as unknown as ShortLinksSettings,
  );
  return { links, repo, expiry };
}

describe('the managed links cron (docs/19)', () => {
  it('stops active links past their expiry, managed only; a second pass changes nothing', async () => {
    const { links, expiry } = world();
    expect(await expiry.expire(NOW)).toBe(1);
    expect(await expiry.expire(NOW)).toBe(0);
    expect(links.map((l) => [l.code, l.status])).toEqual([
      ['old', 'expired'],
      ['due', 'expired'],
      ['live', 'active'],
      ['sys', 'active'],
    ]);
  });

  it('deletes links expired more than short_link_purge_days ago, never a system link; idempotent', async () => {
    const { links, expiry, repo } = world();
    expect(await expiry.purge(NOW)).toBe(1);
    expect(repo.purge).toHaveBeenCalledWith(new Date('2026-10-18T12:00:00Z'));
    expect(await expiry.purge(NOW)).toBe(0);
    expect(links.map((l) => l.code)).toEqual(['due', 'live', 'sys']);
  });

  it('the cutoff is now minus the days', () => {
    expect(purgeCutoff(NOW, 1).toISOString()).toBe('2026-11-16T12:00:00.000Z');
  });

  it('the job never throws: a failed pass logs and answers 0', async () => {
    const failing = {
      expire: vi.fn().mockRejectedValue(new Error('db')),
      purge: vi.fn().mockRejectedValue(new Error('db')),
    };
    const job = new LinkExpiryJob(failing as unknown as LinkExpiry);
    expect(await job.expireOnce(NOW)).toBe(0);
    expect(await job.purgeOnce(NOW)).toBe(0);
  });
});
