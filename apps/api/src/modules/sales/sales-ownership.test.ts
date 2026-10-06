import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { ownershipOf } from './sales-ownership';

describe('ownershipOf (leads and brought students)', () => {
  it('nothing at all: empty, and only the two first reads are made', async () => {
    const { db, calls } = fakeDb({ leads: [{ data: [] }], students: [{ data: [] }] });
    expect(await ownershipOf(db, 'a')).toEqual({ leadIds: [], guardianIds: [], studentIds: [], phones: [] });
    expect(calls.map((c) => c.table).filter((t, i, all) => all.indexOf(t) === i)).toEqual(['leads', 'students']);
  });

  it('a lead only: as before, lead phones then the converted family and its children', async () => {
    const { db } = fakeDb({
      leads: [{ data: [{ id: 'l1', phone_e164: '+966551110000', converted_guardian_id: 'g1' }] }],
      students: [{ data: [] }, { data: [{ id: 's1' }] }],
      guardians: [{ data: [{ phone_e164: '+966552220000' }] }],
    });
    expect(await ownershipOf(db, 'a')).toEqual({
      leadIds: ['l1'], guardianIds: ['g1'], studentIds: ['s1'], phones: ['+966551110000', '+966552220000'],
    });
  });

  it('a brought student with no lead: its guardian phone and itself, nothing of its siblings', async () => {
    const { db, calls } = fakeDb({
      leads: [{ data: [] }],
      students: [{ data: [{ id: 's9', guardian_id: 'g9' }] }],
      guardians: [{ data: [{ phone_e164: '+966553330000' }] }],
    });
    expect(await ownershipOf(db, 'a')).toEqual({ leadIds: [], guardianIds: ['g9'], studentIds: ['s9'], phones: ['+966553330000'] });
    expect(calls.find((c) => c.table === 'students' && c.method === 'eq')?.args).toEqual(['brought_by', 'a']);
    expect(calls.filter((c) => c.table === 'students' && c.method === 'in')).toEqual([]);
  });

  it('both: ids deduplicated across the two paths', async () => {
    const { db } = fakeDb({
      leads: [{ data: [{ id: 'l1', phone_e164: '+966551110000', converted_guardian_id: 'g1' }] }],
      students: [{ data: [{ id: 's1', guardian_id: 'g1' }] }, { data: [{ id: 's1' }, { id: 's2' }] }],
      guardians: [{ data: [{ phone_e164: '+966552220000' }] }],
    });
    const own = await ownershipOf(db, 'a');
    expect(own.studentIds.sort()).toEqual(['s1', 's2']);
    expect(own.guardianIds).toEqual(['g1']);
  });

  it('a database error is thrown', async () => {
    const { db } = fakeDb({ leads: [{ error: { message: 'boom' } }], students: [{ data: [] }] });
    await expect(ownershipOf(db, 'a')).rejects.toBeDefined();
  });
});
