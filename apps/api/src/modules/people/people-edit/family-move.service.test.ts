import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo } from './people-edit.repo';

/** The ownership rule off: every family is hers. */
const owns = (): Promise<void> => Promise.resolve();
const STUDENT = { id: 's1', guardian_id: 'g-old', contact_is_self: false, profile_id: null };
const FRESH = { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo', country: null };
/** Tables a family move never touches: money, lessons and chats stay keyed as they are. */
const UNTOUCHED = [
  'subscriptions',
  'payments',
  'lesson_students',
  'lessons',
  'messages',
  'guardian_phones',
  'student_channels',
];

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const service = new FamilyMoveService(
    new PeopleEditRepo(fake.db),
    new FamilySearchRepo(fake.db),
    new GuardiansService(fake.db),
    new AuditService(fake.db),
  );
  return { ...fake, service };
}

describe('FamilyMoveService «ربط بولي أمر آخر»', () => {
  it('moves to an existing family: guardian_id only, compare-and-set on the old one, one audit row', async () => {
    const t = setup({
      students: [
        { data: STUDENT },
        { data: { ...STUDENT, guardian_id: 'g-new', contact_is_self: false } },
      ],
      guardians: [{ data: { id: 'g-new' } }],
      audit_log: [{}],
    });
    await expect(
      t.service.move({
        studentId: 's1',
        move: { kind: 'existing', id: 'g-new' },
        actorId: 'u1',
        owns,
      }),
    ).resolves.toEqual({ student_id: 's1', guardian_id: 'g-new' });
    expect(t.argsOf('students', 'update')?.[0]).toEqual({
      guardian_id: 'g-new',
      contact_is_self: false,
    });
    const eqs = t.calls
      .filter((c) => c.table === 'students' && c.method === 'eq')
      .map((c) => c.args);
    expect(eqs).toEqual(expect.arrayContaining([['guardian_id', 'g-old']]));
    expect(t.argsOf('audit_log', 'insert')?.[0]).toMatchObject({
      entity: 'students',
      entity_id: 's1',
      action: 'guardian_change',
      before: { guardian_id: 'g-old', contact_is_self: false },
      after: { guardian_id: 'g-new', contact_is_self: false, guardian_created: false },
    });
    expect(t.trips.filter((table) => UNTOUCHED.includes(table))).toEqual([]);
    expect(t.calls.filter((c) => c.method === 'delete')).toEqual([]);
  });

  it('a new family: found by its phone first, else created, then the same move', async () => {
    const found = setup({
      students: [{ data: STUDENT }, { data: STUDENT }],
      guardians: [{ data: { id: 'g-phone' } }],
      audit_log: [{}],
    });
    await found.service.move({
      studentId: 's1',
      move: { kind: 'new', guardian: FRESH },
      actorId: 'u1',
      owns,
    });
    expect(found.argsOf('guardians', 'insert')).toBeUndefined();
    expect(found.argsOf('students', 'update')?.[0]).toMatchObject({ guardian_id: 'g-phone' });

    const created = setup({
      students: [{ data: STUDENT }, { data: STUDENT }],
      guardians: [{ data: null }, { data: { id: 'g-made' } }],
      audit_log: [{}],
    });
    await created.service.move({
      studentId: 's1',
      move: { kind: 'new', guardian: FRESH },
      actorId: 'u1',
      owns,
    });
    expect(created.argsOf('guardians', 'insert')?.[0]).toMatchObject({
      name: FRESH.name,
      phone_e164: FRESH.phone_e164,
      created_by: 'u1',
    });
    const rows = created.calls.filter((c) => c.table === 'audit_log').map((c) => c.args[0]);
    expect(rows).toEqual([
      expect.objectContaining({ entity: 'guardians', entity_id: 'g-made', action: 'create' }),
      expect.objectContaining({
        after: expect.objectContaining({ guardian_id: 'g-made', guardian_created: true }),
      }),
    ]);
  });

  it('refuses the same family, an unknown one, a moved student and a taken phone, writing nothing', async () => {
    const cases: [
      Record<string, FakeResult[]>,
      Parameters<FamilyMoveService['move']>[0]['move'],
      string,
    ][] = [
      [
        { students: [{ data: STUDENT }], guardians: [{ data: { id: 'g-old' } }] },
        { kind: 'existing', id: 'g-old' },
        'same_guardian',
      ],
      [
        { students: [{ data: STUDENT }], guardians: [{ data: null }] },
        { kind: 'existing', id: 'g-x' },
        'guardian_not_found',
      ],
      [{ students: [{ data: null }] }, { kind: 'existing', id: 'g-new' }, 'student_not_found'],
      [
        { students: [{ data: STUDENT }, { data: null }], guardians: [{ data: { id: 'g-new' } }] },
        { kind: 'existing', id: 'g-new' },
        'guardian_changed',
      ],
      [
        {
          students: [{ data: STUDENT }],
          guardians: [
            { data: null },
            { error: { code: '23505', message: 'guardian_phones_pkey' } },
          ],
        },
        { kind: 'new', guardian: FRESH },
        'phone_taken',
      ],
    ];
    for (const [results, move, code] of cases) {
      const t = setup(results);
      await expect(
        t.service.move({ studentId: 's1', move, actorId: 'u1', owns }),
      ).rejects.toMatchObject({
        response: { code },
      });
      expect(t.trips).not.toContain('audit_log');
    }
  });
});
