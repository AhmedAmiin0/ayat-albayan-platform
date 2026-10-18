import { changeRequest, currentPicks } from './change-body';

const RIYADH = 'Asia/Riyadh';
const SUB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REQ = '12345678-1234-4234-8234-123456789012';
const days = [
  { weekday: 0, startTimeLocal: '17:00' },
  { weekday: 4, startTimeLocal: '18:00' },
];

describe('currentPicks: the course’s own days, from today in its zone', () => {
  it('Thursday 1 Oct 03:00 Riyadh: today 18:00 and Sunday 4 Oct 17:00', () => {
    expect(currentPicks({ days, tz: RIYADH }, new Date('2026-10-01T00:00:00Z'))).toEqual([
      '2026-10-01T15:00:00.000Z',
      '2026-10-04T14:00:00.000Z',
    ]);
  });
  it('a time already past today moves on a week', () => {
    expect(currentPicks({ days, tz: RIYADH }, new Date('2026-10-01T16:00:00Z'))).toEqual([
      '2026-10-04T14:00:00.000Z',
      '2026-10-08T15:00:00.000Z',
    ]);
  });
});

describe('changeRequest: POST …/course/change', () => {
  it('nothing picked → null', () => {
    expect(changeRequest({ subscriptionId: SUB, picks: [], tz: RIYADH, requestId: REQ })).toBeNull();
  });
  it('the earliest pick is the change point; the other day’s own time goes to dayTimes', () => {
    const picks = ['2026-10-04T14:00:00.000Z', '2026-10-01T15:00:00.000Z'];
    expect(changeRequest({ subscriptionId: SUB, picks, tz: RIYADH, requestId: REQ })).toEqual({
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
    expect(changeRequest({ subscriptionId: SUB, picks, tz: RIYADH, requestId: REQ })).not.toHaveProperty('dayTimes');
  });
});
