import { expect, test } from '@playwright/test';
import { rolledBack } from '../support/rls';

// Chat files (docs/21 §2): migration 500 lets wa-media take WhatsApp's audio/video up to 16 MiB,
// 505 adds messages.media_name (a sent file's name, never blank), 510 points messages.created_by
// at profiles so the API can embed the sender's name. Rolled back; database only.

test.describe('chat files in the database (migrations 500, 505, 510)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('wa-media takes 16 MiB and audio/ogg and video/mp4', async () => {
    await rolledBack(async (tx) => {
      const [b] = await tx<{ size: string; ogg: boolean; mp4: boolean }[]>`select file_size_limit::text as size,
        'audio/ogg' = any(allowed_mime_types) as ogg, 'video/mp4' = any(allowed_mime_types) as mp4
        from storage.buckets where id = 'wa-media'`;
      expect(b).toEqual({ size: '16777216', ogg: true, mp4: true });
    });
  });

  test('a blank media_name violates the check', async () => {
    await rolledBack(async (tx) => {
      const code = (q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
      const insert = (name: string) => () => tx`insert into public.messages (direction, phone_e164, body, media_name, status)
        values ('outbound', '+966500000505', 'ملف', ${name}, 'sent')`;
      expect(await code(insert('   '))).toBe('23514');
      expect(await code(insert('receipt.pdf'))).toBe('ok');
    });
  });

  test('messages_created_by_fkey targets public.profiles and no created_by is an orphan', async () => {
    await rolledBack(async (tx) => {
      const [fk] = await tx<{ profiles: boolean }[]>`select confrelid = 'public.profiles'::regclass as profiles
        from pg_constraint where conname = 'messages_created_by_fkey' and conrelid = 'public.messages'::regclass`;
      expect(fk).toEqual({ profiles: true });
      const [orphans] = await tx<{ n: number }[]>`select count(*)::int as n from public.messages m
        left join public.profiles p on p.id = m.created_by where m.created_by is not null and p.id is null`;
      expect(orphans?.n).toBe(0);
    });
  });
});
