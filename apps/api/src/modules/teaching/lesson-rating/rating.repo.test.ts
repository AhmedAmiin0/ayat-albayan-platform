import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RatingRepo } from './rating.repo';

describe('RatingQueries.guardianByPhone («إرسال تقييم الحلقة» from a family chat)', () => {
  it('a family’s second number is that family, with its main number and tz', async () => {
    const family = { id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh', phone_e164: '+966551110000' };
    const t = fakeDb({ guardian_phones: [{ data: { guardian: family } }] });
    expect(await new RatingRepo(t.db).guardianByPhone('+966552220000')).toEqual({
      id: 'g1',
      phone_e164: '+966551110000',
      tz: 'Asia/Riyadh',
    });
    expect(t.argsOf('guardian_phones', 'eq')).toEqual(['phone_e164', '+966552220000']);
  });

  it('a lead or an unknown number → null', async () => {
    expect(
      await new RatingRepo(fakeDb({ guardian_phones: [{ data: null }] }).db).guardianByPhone(
        '+966559990000',
      ),
    ).toBeNull();
  });
});

describe('RatingRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new RatingRepo(db).byIds(['l1']))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new RatingRepo(db).byIds(['l1']))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
