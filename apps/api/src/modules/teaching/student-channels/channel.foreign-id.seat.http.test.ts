import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const SEAT = `/sales/students/${ST}/channel/seat`;
const FAMILY_AND_TEACHER: readonly Who[] = ['teacher', 'guardian', 'student'];

// Any assistant reads any chat's seat by design (docs/31 §2: one seat, any assistant may take a
// free one), so the denial is for every other login and for a student id that does not exist.
describe('GET /sales/students/:id/channel/seat with someone else\'s student id', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(t.seats.seat, { broughtBy: 'p-sa', heldBy: 'p-sa' });
  });

  it('a teacher, guardian or student is 403 and reads no seat', async () => {
    for (const who of FAMILY_AND_TEACHER) {
      expect([who, (await t.call('GET', SEAT, who)).statusCode]).toEqual([who, 403]);
    }
    expect(t.seats.repo.read).not.toHaveBeenCalled();
  });

  it('another assistant sees only the holder\'s name, never the seat as hers', async () => {
    const res = await t.call('GET', SEAT, 'otherSales');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      holder: { id: 'p-sa', name: 'سارة' },
      mine: false,
      bringer: false,
      canTake: false,
    });
  });

  it('an unknown student id is 404 student_not_found', async () => {
    const unknown = '/sales/students/52000000-0000-4000-8000-0000000000ff/channel/seat';
    const res = await t.call('GET', unknown, 'otherSales');
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
  });
});
