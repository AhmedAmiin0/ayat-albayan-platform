import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { sendableTemplates } from './template-gate.repo';

// The rows the queue gate and the legacy send pass may use (docs/19 «crm driver»).

const OWN = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', status: 'not_submitted' });
const V2 = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', status: 'approved' });
const BOOKING = templateRow({ status: 'approved' });

const read = async (rows: unknown[]) => {
  const { db, calls } = fakeDb({ message_templates: [{ data: rows }] });
  const keys = (await sendableTemplates(db)).map((t) => t.key);
  return { keys, calls };
};

afterEach(() => vi.unstubAllEnvs());

describe('sendableTemplates', () => {
  it('crm line: teacher_new_student by teacher_lesson_v2; the rest by their own status', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    const { keys, calls } = await read([BOOKING, OWN, V2]);
    expect(keys).toEqual(['booking_confirmation', 'teacher_new_student', 'teacher_lesson_v2']);
    expect(calls.find((c) => c.method === 'or')?.args).toEqual(['status.eq.approved,key.in.(teacher_new_student)']);
  });

  it('meta line: a not_submitted teacher_new_student stays out', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    expect((await read([BOOKING, OWN, V2])).keys).toEqual(['booking_confirmation', 'teacher_lesson_v2']);
  });

  it('a chat-line row reads the chat line\'s driver', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    vi.stubEnv('WA_CHAT_PROVIDER', 'meta');
    expect((await read([{ ...OWN, line: 'chat' }, V2])).keys).toEqual(['teacher_lesson_v2']);
  });

  it('a failed read throws (the pass sends nothing)', async () => {
    const { db } = fakeDb({ message_templates: [{ error: { message: 'down' } }] });
    await expect(sendableTemplates(db)).rejects.toThrow('templates read failed: down');
  });
});
