import { changePicks, type PrefilledPick } from '@ab/shared';
import { changeRequest } from './change-body';

const RIYADH = 'Asia/Riyadh';
const SUB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REQ = '12345678-1234-4234-8234-123456789012';
const days = [
  { weekday: 0, startTimeLocal: '17:00' },
  { weekday: 4, startTimeLocal: '18:00' },
];
const course = { days, tz: RIYADH, startsOn: '2026-09-01' };
const ats = (picks: PrefilledPick[]) => picks.map((p) => p.at);

describe('changePicks: the course’s own days, from max(today, its first day) in its zone', () => {
  it('Thursday 1 Oct 03:00 Riyadh: today 18:00 and Sunday 4 Oct 17:00', () => {
    expect(ats(changePicks(course, new Date('2026-10-01T00:00:00Z')))).toEqual(['2026-10-01T15:00:00.000Z', '2026-10-04T14:00:00.000Z']);
  });
  it('a time already past today moves on a week', () => {
    expect(ats(changePicks(course, new Date('2026-10-01T16:00:00Z')))).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-08T15:00:00.000Z']);
  });
  it('a course booked ahead (a renewal) opens on its own first week', () => {
    const ahead = { ...course, startsOn: '2026-10-11' };
    expect(ats(changePicks(ahead, new Date('2026-10-01T00:00:00Z')))).toEqual(['2026-10-11T14:00:00.000Z', '2026-10-15T15:00:00.000Z']);
  });
  it('each pick carries its day’s own time', () => {
    expect(changePicks(course, new Date('2026-10-01T00:00:00Z')).map((p) => p.startTimeLocal)).toEqual(['18:00', '17:00']);
  });
});

describe('changeRequest: POST …/course/change', () => {
  const input = { subscriptionId: SUB, tz: RIYADH, requestId: REQ, prefilled: [] };
  it('nothing picked → null', () => {
    expect(changeRequest({ ...input, picks: [] })).toBeNull();
  });
  it('the earliest pick is the change point; the other day’s own time goes to dayTimes', () => {
    const picks = ['2026-10-04T14:00:00.000Z', '2026-10-01T15:00:00.000Z'];
    expect(changeRequest({ ...input, picks })).toEqual({
      subscriptionId: SUB,
      byday: [0, 4],
      startTimeLocal: '18:00',
      startsOn: '2026-10-01',
      startsAt: '2026-10-01T15:00:00.000Z',
      dayTimes: [{ weekday: 0, startTimeLocal: '17:00' }],
      clientRequestId: REQ,
    });
  });
  it('days sharing one time send no dayTimes', () => {
    const picks = ['2026-10-04T14:00:00.000Z', '2026-10-08T14:00:00.000Z'];
    expect(changeRequest({ ...input, picks })).not.toHaveProperty('dayTimes');
  });
  it('a pick still on its prefilled one keeps that day’s explicit time', () => {
    // A DST gap or repeat can shift an instant's wall time; the prefilled day's own time is sent.
    const at = '2026-10-01T15:00:00.000Z';
    const prefilled = [{ at, weekday: 4, startTimeLocal: '17:59' }];
    expect(changeRequest({ ...input, picks: [at], prefilled })).toMatchObject({ byday: [4], startTimeLocal: '17:59' });
    expect(changeRequest({ ...input, picks: ['2026-10-08T15:00:00.000Z'], prefilled })?.startTimeLocal).toBe('18:00');
  });
});
