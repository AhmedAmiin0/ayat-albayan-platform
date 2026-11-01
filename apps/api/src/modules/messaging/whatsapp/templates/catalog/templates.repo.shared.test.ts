import { describe, expect, it } from 'vitest';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { TemplatesRepo } from './templates.repo';

const T = 'message_templates';

describe('TemplatesQueries with Redis (two API copies)', () => {
  it('a template write on one copy drops the other copy\'s display copies at once', async () => {
    const redis = fakeRedis();
    const row = templateRow();
    const one = fakeDb({ [T]: [{ data: { ...row, status: 'paused' } }] });
    const other = fakeDb({ [T]: [{ data: row }, { data: { ...row, status: 'paused' } }] });
    const a = new TemplatesRepo(one.db, redis.copy().cache);
    const b = new TemplatesRepo(other.db, redis.copy().cache);
    await expect(b.cached(row.key, 0)).resolves.toEqual(row);
    await a.update(row.key, { status: 'paused' });
    await settle();
    await expect(b.cached(row.key, 1)).resolves.toMatchObject({ status: 'paused' });
  });
});
