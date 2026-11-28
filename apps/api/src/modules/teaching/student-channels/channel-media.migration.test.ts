import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHANNEL_BODY_MAX,
  CHANNEL_MEDIA_MAX_BYTES,
  CHANNEL_MEDIA_MIMES,
  CHANNEL_MESSAGE_KINDS,
} from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { BUCKETS } from '@/common/storage/storage.paths';

// The chat upgrade (docs/31 §2), read as text: no database in unit tests (applied twice and
// exercised on a scratch Postgres 16 when written).
const strip = (s: string) =>
  s
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const sql = strip(readFileSync(join(MIGRATIONS_DIR, '20261117090300_channel_media.sql'), 'utf8'));
const quoted = (list: string) => [...list.matchAll(/'([a-z0-9/]+)'/g)].map((m) => m[1]);

describe('migration 20261117090300: files, replies, client ids, forward-only read marks', () => {
  it('the kinds and the body rule match the shared contract; empty only with a file', () => {
    expect(quoted(/check \(kind in \(([^)]*)\)/.exec(sql)?.[1] ?? '')).toEqual([
      ...CHANNEL_MESSAGE_KINDS,
    ]);
    expect(sql).toContain(
      `check (char_length(body) between 0 and ${CHANNEL_BODY_MAX} and (body <> '' or attachment_path is not null))`,
    );
    expect(sql).toContain("check ((kind = 'text') = (attachment_path is null)");
  });

  it('every new check is added not valid, then validated (no long lock)', () => {
    expect(sql.match(/ not valid;/g)).toHaveLength(3);
    expect(sql.match(/validate constraint/g)).toHaveLength(3);
    expect(sql).toContain("set local lock_timeout = '5s';");
  });

  it('a resend is found by (channel, sender, client id); the reply FK has its index', () => {
    expect(sql).toContain(
      'on public.channel_messages (channel_id, sender_profile_id, client_id) where client_id is not null;',
    );
    expect(sql).toContain(
      'reply_to_id uuid references public.channel_messages (id) on delete set null',
    );
    expect(sql).toContain(
      'on public.channel_messages (reply_to_id) where reply_to_id is not null;',
    );
  });

  it('channel_mark_read never moves a mark back; the service role only', () => {
    expect(sql).toContain(
      'do update set last_read_at = greatest(r.last_read_at, excluded.last_read_at)',
    );
    expect(sql).toContain(
      'from public, anon, authenticated;\ngrant execute on function public.channel_mark_read(uuid, uuid, timestamptz) to service_role;',
    );
  });

  it('the private bucket takes the shared types and cap; no client policy (the API signs)', () => {
    expect(sql).toContain(
      `('${BUCKETS.channelMedia}', '${BUCKETS.channelMedia}', false, ${CHANNEL_MEDIA_MAX_BYTES},`,
    );
    const mimes = quoted(/array\[([^\]]*)\]/.exec(sql)?.[1] ?? '');
    expect(mimes.sort()).toEqual([...CHANNEL_MEDIA_MIMES].sort());
    // A file deleted for everyone must stay unreadable: no read policy, the draft's is dropped.
    expect(sql).not.toMatch(/create policy [^;]* on storage\.objects/);
    expect(sql).toContain('drop policy if exists storage_channel_media_read on storage.objects;');
    expect(sql).toContain('drop function if exists public.can_read_channel_media(text);');
  });

  it('a message’s bell rows are found by their key prefix', () => {
    expect(sql).toContain(
      "on public.push_notifications (dedup_key text_pattern_ops) where kind = 'channel_message';",
    );
  });
});
