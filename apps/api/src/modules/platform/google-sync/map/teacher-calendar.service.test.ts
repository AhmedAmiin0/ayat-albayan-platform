import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import type { GoogleRuntime } from '../google-runtime';
import { TEACHER_ID } from '../google-sync.fakes';
import { TeacherCalendarService } from './teacher-calendar.service';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';

/** teachers read / update and the counts rpc, recorded; `changed` = rows the update touched. */
function fakeDb(input: { owner: string; changed: number }) {
  const updates: object[] = [];
  const read = { data: { id: TEACHER_ID, calendar_owner: input.owner, calendar_owner_changed_at: null }, error: null };
  const update = (patch: object) => {
    updates.push(patch);
    const chain = { eq: () => chain, neq: () => chain, select: async () => ({ data: Array.from({ length: input.changed }, () => ({ id: TEACHER_ID })), error: null }) };
    return chain;
  };
  const from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => read }) }), update });
  const rpc = vi.fn().mockResolvedValue({ data: [{ managed: 12, script_event_present: 3 }], error: null });
  return { db: { from, rpc } as unknown as Db, updates, rpc };
}
const runtime = () => ({ job: { kick: vi.fn().mockResolvedValue(undefined) } });

describe('TeacherCalendarService', () => {
  it('the view: owner and this teacher\'s managed / script_event_present counts', async () => {
    const f = fakeDb({ owner: 'platform', changed: 0 });
    const view = await new TeacherCalendarService(f.db, runtime() as unknown as GoogleRuntime).view(TEACHER_ID);
    expect(view).toEqual({ teacher_id: TEACHER_ID, owner: 'platform', changed_at: null, managed: 12, script_event_present: 3 });
    expect(f.rpc).toHaveBeenCalledWith('google_teacher_calendar_counts', { p_teacher_id: TEACHER_ID });
  });

  it('a switch writes the owner with the admin as actor (the DB trigger queues the lessons) and kicks the worker', async () => {
    const f = fakeDb({ owner: 'platform', changed: 1 });
    const run = runtime();
    await new TeacherCalendarService(f.db, run as unknown as GoogleRuntime).setOwner({ teacherId: TEACHER_ID, owner: 'platform', actorId: ACTOR });
    expect(f.updates).toEqual([{ calendar_owner: 'platform', calendar_owner_changed_by: ACTOR }]);
    expect(run.job.kick).toHaveBeenCalledOnce();
  });

  it('the same owner again changes nothing: no kick', async () => {
    const f = fakeDb({ owner: 'script', changed: 0 });
    const run = runtime();
    const view = await new TeacherCalendarService(f.db, run as unknown as GoogleRuntime).setOwner({ teacherId: TEACHER_ID, owner: 'script', actorId: ACTOR });
    expect(view.owner).toBe('script');
    expect(run.job.kick).not.toHaveBeenCalled();
  });
});
