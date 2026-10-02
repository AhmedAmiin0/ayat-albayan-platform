import { describe, expect, it, vi } from 'vitest';
import { LessonEvents } from '../../common/events/lesson-events';
import type { LessonWriter } from '../scheduling/lesson-writer';
import { LessonStore } from './lesson-store';
import type { LessonsQueries } from './lessons.queries';

describe('LessonStore.commit — the audit row rides in the same transaction (R-NFR-03)', () => {
  it('passes the audit inside the change set; there is no separate audit write to fail', async () => {
    const writer = { apply: vi.fn().mockResolvedValue(undefined) };
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter, new LessonEvents());
    await store.commit({
      change: { actor: 'u1', changes: [] },
      audit: { entity: 'lessons', entityId: 'L1', action: 'cancel', before: { status: 'scheduled' }, after: { by: 'admin' } },
      transition: { from: 'scheduled', event: 'cancel_by_admin' },
    });
    expect(writer.apply).toHaveBeenCalledWith({
      actor: 'u1',
      changes: [],
      audit: { entity: 'lessons', entity_id: 'L1', action: 'cancel', before: { status: 'scheduled' }, after: { by: 'admin' } },
    });
  });

  it('after the commit, LessonEvents gets the changed lesson ids (R-SUB-02 alerts); not on a failure', async () => {
    const events = new LessonEvents();
    const listener = vi.fn().mockResolvedValue(undefined);
    events.onChanged(listener);
    const writer = { apply: vi.fn().mockResolvedValue(undefined) };
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter, events);
    const commit = {
      change: { actor: 'u1', changes: [{ id: 'L1', from_status: 'scheduled' as const, to_status: 'completed' as const }] },
      audit: { entity: 'lessons', entityId: 'L1', action: 'status_change' },
      transition: { from: 'scheduled' as const, event: 'complete' as const },
    };
    await store.commit(commit);
    expect(listener).toHaveBeenCalledWith(['L1']);
    writer.apply.mockRejectedValueOnce(new Error('db down'));
    await expect(store.commit(commit)).rejects.toThrow('db down');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
