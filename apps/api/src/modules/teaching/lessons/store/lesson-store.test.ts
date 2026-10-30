import { describe, expect, it, vi } from 'vitest';
import { LessonEvents } from '../../../../common/events/lesson-events';
import type { LessonWriter } from '../../scheduling/occurrences/lesson-writer';
import { LessonStore } from './lesson-store';
import type { LessonsQueries } from '../lessons.queries';
import { fakeFamilyMove } from '@/modules/teaching/schedule-notices/schedule-notices.fakes';

describe('LessonStore.commit — the audit row rides in the same transaction (R-NFR-03)', () => {
  it('passes the audit inside the change set; there is no separate audit write to fail', async () => {
    const writer = { apply: vi.fn().mockResolvedValue(undefined) };
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter, new LessonEvents(), fakeFamilyMove().move);
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
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter, events, fakeFamilyMove().move);
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

  it('retime (R-SCH-11): the audit rides in the payload; the balance alerts hear about the lesson; not on a failure', async () => {
    const events = new LessonEvents();
    const listener = vi.fn().mockResolvedValue(undefined);
    events.onChanged(listener);
    const writer = { retime: vi.fn().mockResolvedValue(undefined) };
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter, events, fakeFamilyMove().move);
    const change = {
      actor: 'u1',
      lesson_id: 'L1',
      from: { status: 'scheduled' as const, starts_at: 'a', ends_at: 'b' },
      to: { starts_at: 'c', ends_at: 'd' },
      reason: null,
      override_reason: null,
      retime_open: true,
      refresh_pdf: false,
      messages: [],
      audit: { entity: 'lessons', entity_id: 'L1', action: 'time_edit' },
    };
    await store.retime(change);
    expect(writer.retime).toHaveBeenCalledWith(change);
    expect(listener).toHaveBeenCalledWith(['L1']);
    writer.retime.mockRejectedValueOnce(new Error('db down'));
    await expect(store.retime(change)).rejects.toThrow('db down');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
