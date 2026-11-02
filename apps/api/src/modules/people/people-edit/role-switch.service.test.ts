import { describe, expect, it } from 'vitest';
import { audits, GUARDIAN, none, roleSetup as setup, STUDENT } from './people-edit.test-app';

describe('«الطالب هو ولي الأمر» (contact_is_self)', () => {
  it('sets it and audits it; the same value writes nothing', async () => {
    const t = setup({
      students: [
        { data: STUDENT },
        { data: [STUDENT] },
        { data: { ...STUDENT, contact_is_self: true } },
      ],
      audit_log: [{}],
    });
    await t.service.setSelf({ studentId: 's1', value: true, actorId: 'u1' });
    expect(t.argsOf('students', 'update')?.[0]).toEqual({ contact_is_self: true });
    expect(audits(t)).toEqual([
      expect.objectContaining({
        action: 'contact_is_self',
        before: { contact_is_self: false },
        after: { contact_is_self: true },
      }),
    ]);
    const same = setup({ students: [{ data: STUDENT }] });
    await same.service.setSelf({ studentId: 's1', value: false, actorId: 'u1' });
    expect(same.argsOf('students', 'update')).toBeUndefined();
  });

  it('409 family_has_self when another child already holds the number', async () => {
    const t = setup({
      students: [{ data: STUDENT }, { data: [STUDENT, { id: 's2', contact_is_self: true }] }],
    });
    await expect(
      t.service.setSelf({ studentId: 's1', value: true, actorId: 'u1' }),
    ).rejects.toMatchObject({ response: { code: 'family_has_self' } });
    expect(t.argsOf('students', 'update')).toBeUndefined();
  });
});

describe('«تحويل إلى طالب» (guardian → student of their own family)', () => {
  it('adds a contact_is_self student with the guardian name and tz; the guardian row stays', async () => {
    const t = setup({
      guardians: [{ data: GUARDIAN }],
      students: [
        { data: [{ id: 's2', name: 'سهيلة', contact_is_self: false }] },
        { data: { id: 's9', code: 'AB-0300' } },
      ],
      audit_log: [{}],
    });
    await expect(t.service.guardianToStudent('g1', 'u1')).resolves.toEqual({
      id: 's9',
      code: 'AB-0300',
    });
    expect(t.argsOf('students', 'insert')?.[0]).toMatchObject({
      guardian_id: 'g1',
      name: 'ولي أمر',
      tz: 'Africa/Cairo',
      contact_is_self: true,
      created_by: 'u1',
    });
    expect(
      t.calls.filter(
        (c) =>
          c.table === 'guardians' &&
          c.method !== 'select' &&
          c.method !== 'eq' &&
          c.method !== 'maybeSingle',
      ),
    ).toEqual([]);
    expect(audits(t)).toEqual([
      expect.objectContaining({
        entity: 'students',
        entity_id: 's9',
        action: 'converted_from_guardian',
      }),
    ]);
  });

  it('409 guardian_has_self / duplicate_student, 404 for an unknown guardian; nothing inserted', async () => {
    const self = setup({
      guardians: [{ data: GUARDIAN }],
      students: [{ data: [{ id: 's2', name: 'سهيلة', contact_is_self: true }] }],
    });
    await expect(self.service.guardianToStudent('g1', 'u1')).rejects.toMatchObject({
      response: { code: 'guardian_has_self' },
    });
    const twin = setup({
      guardians: [{ data: GUARDIAN }],
      students: [
        { data: [{ id: 's2', code: 'AB-0201', name: 'ولي امر', contact_is_self: false }] },
      ],
    });
    await expect(twin.service.guardianToStudent('g1', 'u1')).rejects.toMatchObject({
      response: {
        code: 'duplicate_student',
        candidates: [{ id: 's2', code: 'AB-0201', name: 'ولي امر' }],
      },
    });
    const gone = setup({ guardians: [{ data: null }] });
    await expect(gone.service.guardianToStudent('g1', 'u1')).rejects.toMatchObject({
      response: { code: 'guardian_not_found' },
    });
    for (const t of [self, twin, gone]) expect(t.argsOf('students', 'insert')).toBeUndefined();
  });
});
