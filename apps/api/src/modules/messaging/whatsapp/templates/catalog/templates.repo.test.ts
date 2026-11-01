import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { TemplatesRepo } from './templates.repo';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';

const T = 'message_templates';

describe('TemplatesQueries — the registry rows', () => {
  it('all by key, one by key, update returns the new row; DB errors surface', async () => {
    const row = templateRow();
    const { db, argsOf } = fakeDb({
      [T]: [{ data: [row] }, { data: row }, { data: { ...row, status: 'paused' } }, { error: { message: 'down' } }],
    });
    const q = new TemplatesRepo(db);
    await expect(q.all()).resolves.toEqual([row]);
    expect(argsOf(T, 'order')).toEqual(['key']);
    await expect(q.get('booking_confirmation')).resolves.toEqual(row);
    expect(argsOf(T, 'eq')).toEqual(['key', 'booking_confirmation']);
    await expect(q.update('booking_confirmation', { status: 'paused' })).resolves.toMatchObject({ status: 'paused' });
    expect(argsOf(T, 'update')).toEqual([{ status: 'paused' }]);
    await expect(q.all()).rejects.toThrow('down');
  });
});
