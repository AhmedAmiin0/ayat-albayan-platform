import { describe, expect, it, vi } from 'vitest';
import type { LessonWriter } from '../scheduling/lesson-writer';
import { LessonStore } from './lesson-store';
import type { LessonsQueries } from './lessons.queries';

describe('LessonStore.commit — the audit row rides in the same transaction (R-NFR-03)', () => {
  it('passes the audit inside the change set; there is no separate audit write to fail', async () => {
    const writer = { apply: vi.fn().mockResolvedValue(undefined) };
    const store = new LessonStore({} as LessonsQueries, writer as unknown as LessonWriter);
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
});
