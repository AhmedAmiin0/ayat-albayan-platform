import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { ClassroomQueries } from '../classroom.queries';
import { ClassroomSettings } from '../classroom.settings';

const ROW = { lesson_id: 'l1', student_id: 's1', token_hash: 'h'.repeat(64), expires_at: '2026-10-27T18:00:00.000Z' };
const queries = (f: ReturnType<typeof fakeDb>) => new ClassroomQueries(f.db, readerOf(ClassroomSettings));

// The portal's link (docs/31) re-tokens THE (lesson, student) row, so a room removal keeps holding.
describe('ClassroomQueries.rotateStudentLink', () => {
  it('an existing row gets the new token and expiry; nothing is inserted', async () => {
    const f = fakeDb({ lesson_join_links: [{ data: [{ id: 'j1' }] }] });
    await queries(f).rotateStudentLink(ROW);
    expect(f.argsOf('lesson_join_links', 'update')).toEqual([{ token_hash: ROW.token_hash, expires_at: ROW.expires_at }]);
    expect(f.argsOf('lesson_join_links', 'match')).toEqual([{ lesson_id: 'l1', student_id: 's1' }]);
    expect(f.argsOf('lesson_join_links', 'insert')).toBeUndefined();
  });

  it('no row yet: inserted; a race (unique violation) re-tokens the other press’s row', async () => {
    const f = fakeDb({ lesson_join_links: [{ data: [] }, { error: { code: '23505', message: 'dup' } }, { data: [{ id: 'j1' }] }] });
    await queries(f).rotateStudentLink(ROW);
    expect(f.argsOf('lesson_join_links', 'insert')).toEqual([ROW]);
    expect(f.calls.filter((c) => c.method === 'update')).toHaveLength(2);
  });

  it('another error is thrown', async () => {
    const f = fakeDb({ lesson_join_links: [{ data: [] }, { error: { message: 'boom' } }] });
    await expect(queries(f).rotateStudentLink(ROW)).rejects.toThrow(/boom/);
  });
});
