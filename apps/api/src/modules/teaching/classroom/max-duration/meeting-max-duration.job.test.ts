import { describe, expect, it } from 'vitest';
import { jobWith, L1, L2, M1, NOW, overdue } from './max-duration.fakes';

const M2 = '00000000-0000-4000-8000-0000000000a2';
const deletes = (http: ReturnType<typeof jobWith>['lk']['http']) =>
  http.mock.calls.filter(([url]) => url.endsWith('/DeleteRoom')).length;

describe('MeetingMaxDurationJob', () => {
  it('ends an overdue meeting like «إنهاء» (ends_at + audit) and closes its room once', async () => {
    const t = jobWith({ meetings: [overdue(M1)], rooms: [{ name: `meeting-${M1}`, minutesAgo: 30 }] });
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 1, closed: 1, failed: 0 });
    expect(t.store.end).toHaveBeenCalledWith(M1, NOW.toISOString());
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: null, entity: 'meetings', entityId: M1, action: 'end',
      after: { ends_at: NOW.toISOString(), reason: 'auto_max_duration' },
    }));
    expect(t.lk.deleted).toEqual([`meeting-${M1}`]);
    expect(deletes(t.lk.http)).toBe(1);
  });

  it('closes lesson rooms opened over the limit and owned rooms created over it; never others', async () => {
    const t = jobWith({
      openedLong: [L1],
      rooms: [
        { name: `lesson-${L1}`, minutesAgo: 20 },
        { name: `lesson-${L2}`, minutesAgo: 121 },
        { name: `meeting-${M2}`, minutesAgo: 30 },
        { name: 'someone-else', minutesAgo: 600 },
        { name: 'lesson-not-a-uuid', minutesAgo: 600 },
      ],
    });
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 0, closed: 2, failed: 0 });
    expect(t.lk.deleted.sort()).toEqual([`lesson-${L1}`, `lesson-${L2}`]);
    expect(deletes(t.lk.http)).toBe(2);
    // LiveKit only: no lesson row, report or earning is written (the repo only reads lessons).
    expect(t.repo.lessonsOpenedBefore).toHaveBeenCalledWith([L1, L2], expect.any(Date));
    expect(t.store.end).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('is idempotent: a second run calls DeleteRoom nowhere and writes no audit row', async () => {
    const t = jobWith({
      meetings: [overdue(M1)],
      rooms: [{ name: `meeting-${M1}`, minutesAgo: 30 }, { name: `lesson-${L2}`, minutesAgo: 200 }],
    });
    await t.job.runOnce(NOW);
    const later = new Date(NOW.getTime() + 300_000);
    expect(await t.job.runOnce(later)).toEqual({ ended: 0, closed: 0, failed: 0 });
    expect(deletes(t.lk.http)).toBe(2);
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('isolates one room failure: the others still close', async () => {
    const t = jobWith({
      meetings: [overdue(M1), overdue(M2)],
      rooms: [
        { name: `meeting-${M1}`, minutesAgo: 30 },
        { name: `meeting-${M2}`, minutesAgo: 30 },
        { name: `lesson-${L2}`, minutesAgo: 200 },
      ],
    });
    t.lk.failOn.add(`meeting-${M1}`);
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 2, closed: 2, failed: 1 });
    expect(t.lk.deleted.sort()).toEqual([`lesson-${L2}`, `meeting-${M2}`]);
  });

  it('a failed meeting end still closes its room; a failed audit is counted', async () => {
    const t = jobWith({ meetings: [overdue(M1)], rooms: [{ name: `meeting-${M1}`, minutesAgo: 30 }] });
    t.audit.record.mockRejectedValueOnce(new Error('db down'));
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 0, closed: 1, failed: 1 });
  });

  it('stops a running recording before closing, so the file is kept', async () => {
    const t = jobWith({ rooms: [{ name: `lesson-${L2}`, minutesAgo: 200 }], egress: { [L2]: 'EG_1' } });
    await t.job.runOnce(NOW);
    expect(t.lk.stopped).toEqual(['EG_1']);
    const order = t.lk.http.mock.calls.map(([url]) => url.split('/').pop());
    expect(order).toEqual(['ListRooms', 'StopEgress', 'DeleteRoom']);
  });

  it('does nothing when the setting is 0', async () => {
    const t = jobWith({ minutes: 0, meetings: [overdue(M1)], rooms: [{ name: `lesson-${L2}`, minutesAgo: 900 }] });
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 0, closed: 0, failed: 0 });
    expect(t.repo.overdueMeetings).not.toHaveBeenCalled();
    expect(t.lk.http).not.toHaveBeenCalled();
  });

  it('never throws: a failed listing is logged and the meetings are still ended', async () => {
    const t = jobWith({ meetings: [overdue(M1)] });
    t.lk.http.mockRejectedValue(new Error('network'));
    expect(await t.job.runOnce(NOW)).toEqual({ ended: 1, closed: 0, failed: 1 });
  });
});
