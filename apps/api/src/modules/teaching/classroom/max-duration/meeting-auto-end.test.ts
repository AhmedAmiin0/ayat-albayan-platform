import { describe, expect, it } from 'vitest';
import { jobWith, M1, NOW } from './max-duration.fakes';
import { MeetingAutoEnd } from './meeting-auto-end';

const ender = () => {
  const t = jobWith();
  return { t, end: new MeetingAutoEnd(t.store as never, t.audit as never) };
};

describe('MeetingAutoEnd', () => {
  it('stamps ends_at like «إنهاء» and audits the reason once', async () => {
    const { t, end } = ender();
    expect(await end.end(M1, NOW)).toBe(true);
    expect(t.store.end).toHaveBeenCalledWith(M1, NOW.toISOString());
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('a meeting already ended (manual end first) keeps its time and gets no audit row', async () => {
    const { t, end } = ender();
    t.store.ended.set(M1, '2026-10-30T11:00:00.000Z');
    expect(await end.end(M1, NOW)).toBe(false);
    expect(t.store.ended.get(M1)).toBe('2026-10-30T11:00:00.000Z');
    expect(t.audit.record).not.toHaveBeenCalled();
  });
});
