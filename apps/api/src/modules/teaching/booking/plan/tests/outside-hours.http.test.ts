import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LIST, outsideApp, S1, S2, TEACHER } from '@/modules/teaching/booking/plan/tests/outside-hours.http.fakes';

const grid = `outside-slots?teacherId=${TEACHER}&durationMin=45`;

describe('GET outside-slots («وقت آخر»): who may read the grid', () => {
  let rig: Awaited<ReturnType<typeof outsideApp>>;
  beforeAll(async () => {
    rig = await outsideApp();
  }, 60_000);
  afterAll(() => rig.app.close());
  beforeEach(() => rig.reset());

  it('admin reads /booking/outside-slots; the query carries no device time', async () => {
    const res = await rig.call({ url: `/booking/${grid}&studentIds=${S1}`, token: 'admin' });
    expect([res.statusCode, res.json()]).toEqual([200, LIST]);
    expect(rig.outside.outside).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: TEACHER, durationMin: 45, studentIds: [S1] }),
    );
    const bad = `/booking/outside-slots?teacherId=${TEACHER}&durationMin=7`;
    expect((await rig.call({ url: bad, token: 'admin' })).statusCode).toBe(400);
  });

  it('sales reads /sales/booking/outside-slots for her own student only', async () => {
    const own = await rig.call({ url: `/sales/booking/${grid}&studentIds=${S1}`, token: 'sales' });
    expect(own.statusCode).toBe(200);
    const foreign = await rig.call({
      url: `/sales/booking/${grid}&studentIds=${S2}`,
      token: 'sales',
    });
    expect([foreign.statusCode, foreign.json().code]).toEqual([403, 'not_your_student']);
    expect(rig.outside.outside).toHaveBeenCalledTimes(1);
  });

  it('a teacher or a guardian is 403 on both grids', async () => {
    for (const url of [`/booking/${grid}`, `/sales/booking/${grid}`]) {
      for (const token of ['teacher', 'guardian']) {
        expect((await rig.call({ url, token })).statusCode).toBe(403);
      }
    }
    expect(rig.outside.outside).not.toHaveBeenCalled();
  });
});
