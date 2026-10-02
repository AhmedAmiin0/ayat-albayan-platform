import { describe, expect, it, vi } from 'vitest';
import { LessonEvents } from './lesson-events';

describe('LessonEvents (R-SUB-02 hook between lesson writers and balance alerts)', () => {
  it('calls every listener with the changed lesson ids, in order', async () => {
    const events = new LessonEvents();
    const calls: string[] = [];
    events.onChanged(async (ids) => void calls.push(`a:${ids.join(',')}`));
    events.onChanged(async (ids) => void calls.push(`b:${ids.join(',')}`));
    await events.changed(['L1', 'L2']);
    expect(calls).toEqual(['a:L1,L2', 'b:L1,L2']);
  });

  it('no ids → no calls', async () => {
    const events = new LessonEvents();
    const listener = vi.fn();
    events.onChanged(listener);
    await events.changed([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('a failing listener never fails the (already committed) change; the next still runs', async () => {
    const events = new LessonEvents();
    const after = vi.fn().mockResolvedValue(undefined);
    events.onChanged(() => Promise.reject(new Error('alerts down')));
    events.onChanged(after);
    await expect(events.changed(['L1'])).resolves.toBeUndefined();
    expect(after).toHaveBeenCalledWith(['L1']);
  });
});
