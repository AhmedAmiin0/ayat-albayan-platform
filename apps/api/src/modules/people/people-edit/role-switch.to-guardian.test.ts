import { describe, expect, it } from 'vitest';
import {
  audits,
  GUARDIAN,
  none,
  roleSetup as setup,
  STUDENT,
} from '@/modules/people/people-edit/testing/people-edit.test-app';

describe('«تحويل إلى ولي أمر» (a student row that is really the parent)', () => {
  it('an empty row: removed with a full audit copy, the family takes its name, nothing else written', async () => {
    const t = setup({
      ...none(),
      students: [{ data: STUDENT }, { data: [STUDENT] }],
      guardians: [{ data: GUARDIAN }, { data: { ...GUARDIAN, name: 'أحمد' } }],
      audit_log: [{}, {}],
    });
    await expect(t.service.studentToGuardian('s1', 'u1')).resolves.toEqual({ guardian_id: 'g1' });
    expect(t.argsOf('students', 'is')).toEqual(['profile_id', null]);
    expect(t.argsOf('guardians', 'update')?.[0]).toEqual({ name: 'أحمد' });
    expect(audits(t)).toEqual([
      expect.objectContaining({
        entity: 'students',
        entity_id: 's1',
        action: 'to_guardian_snapshot',
        before: STUDENT,
      }),
      expect.objectContaining({
        entity: 'guardians',
        entity_id: 'g1',
        action: 'converted_to_guardian',
        before: { name: 'ولي أمر' },
        after: expect.objectContaining({ name: 'أحمد', from_student: 's1' }),
      }),
    ]);
  });

  it('refuses a row with any history (the tables listed) or a login, before any write', async () => {
    const history = setup({
      ...none(),
      subscriptions: [{ count: 1 }],
      channel_messages: [{ count: 3 }],
      students: [{ data: STUDENT }],
    });
    await expect(history.service.studentToGuardian('s1', 'u1')).rejects.toMatchObject({
      status: 409,
      response: { code: 'student_has_records', tables: ['subscriptions', 'channel_messages'] },
    });
    const login = setup({ students: [{ data: { ...STUDENT, profile_id: 'p1' } }] });
    await expect(login.service.studentToGuardian('s1', 'u1')).rejects.toMatchObject({
      response: { code: 'student_has_login' },
    });
    for (const t of [history, login])
      expect(t.calls.filter((c) => c.method === 'delete' || c.method === 'update')).toEqual([]);
  });

  it('a foreign key that appeared since the check → 409 student_has_records, the family untouched', async () => {
    const t = setup({
      ...none(),
      students: [{ data: STUDENT }, { error: { code: '23503', message: 'fk' } }],
      guardians: [{ data: GUARDIAN }],
    });
    await expect(t.service.studentToGuardian('s1', 'u1')).rejects.toMatchObject({
      response: { code: 'student_has_records' },
    });
    expect(t.argsOf('guardians', 'update')).toBeUndefined();
    // Only the copy written before the delete; no conversion row.
    expect(audits(t)).toEqual([expect.objectContaining({ action: 'to_guardian_snapshot' })]);
  });

  it('history that appeared after the copy: checked again, nothing deleted', async () => {
    const t = setup({
      ...none(),
      student_join_links: [{ count: 0 }, { count: 1 }],
      students: [{ data: STUDENT }],
      guardians: [{ data: GUARDIAN }],
    });
    await expect(t.service.studentToGuardian('s1', 'u1')).rejects.toMatchObject({
      response: { code: 'student_has_records', tables: ['student_join_links'] },
    });
    expect(t.calls.filter((c) => c.method === 'delete' || c.method === 'update')).toEqual([]);
  });
});
