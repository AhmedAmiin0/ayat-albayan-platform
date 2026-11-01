import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeQueries, IDS, leadRequest } from '@/modules/teaching/booking/booking.fakes';
import { readerOf } from '@/common/settings/settings.fakes';
import { BookingParties } from './booking.parties';
import type { BookingRepo } from './booking.repo';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';

const SUHAILA = { id: IDS.s1, code: 'AB-0001', name: 'سهيلة', status: 'active' as const };
function setup() {
  const queries = fakeQueries();
  queries.guardianByPhone.mockResolvedValue({ id: IDS.g1, tz: 'Asia/Riyadh', students: [SUHAILA] });
  return { queries, parties: new BookingParties(queries as unknown as BookingRepo, readerOf(BookingSettings)) };
}
const lead = (name: string, over: Record<string, unknown> = {}) =>
  leadRequest({ newStudent: { name, tz: 'Asia/Riyadh' }, ...over });

describe('BookingParties.resolve — lead path duplicate check (R-STU-03, R-LEAD-06, issue A1)', () => {
  it('a family on file with a similar-named child → 409 duplicate_student with the candidates', async () => {
    const { parties } = setup();
    const err = await parties.resolve(lead('سهيله')).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(409);
    expect((err as HttpException).getResponse()).toEqual({
      code: 'duplicate_student',
      message: 'duplicate_student',
      guardian_id: IDS.g1,
      candidates: [SUHAILA],
    });
  });

  it('force books the new student anyway, under the same guardian', async () => {
    const { parties } = setup();
    const who = await parties.resolve(lead('سهيله', { force: true }));
    expect(who.new_student).toMatchObject({ name: 'سهيله' });
    expect(who.booked[0]?.guardian.id).toBe(IDS.g1);
  });

  it('a sibling with another name is not a duplicate', async () => {
    const { parties } = setup();
    const who = await parties.resolve(lead('جودي'));
    expect(who.new_student).toMatchObject({ name: 'جودي', name_normalized: 'جودي' });
  });
});
