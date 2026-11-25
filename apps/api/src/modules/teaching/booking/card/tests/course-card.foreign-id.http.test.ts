import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { profileApp, S1 } from '@/modules/teaching/booking/profile/profile-course.fakes';

type App = Awaited<ReturnType<typeof profileApp>>;
const CARD = `/sales/students/${S1}/course-card`;

// Every assistant reads any student's card, as GET /sales/students/:id (docs/16 row 36); a
// teacher or a family is refused before the student's package is looked up.
describe('GET /sales/students/:id/course-card with someone else\'s student id', () => {
  let t: App;
  beforeAll(async () => {
    t = await profileApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('a teacher or guardian is 403 and no package is read', async () => {
    for (const token of ['teacher', 'guardian']) {
      expect([token, (await t.get(token, CARD)).statusCode]).toEqual([token, 403]);
    }
    expect(t.m.repo.currentSubscription).not.toHaveBeenCalled();
  });
});
