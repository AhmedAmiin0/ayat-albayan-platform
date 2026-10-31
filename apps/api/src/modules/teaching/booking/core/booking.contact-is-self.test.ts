import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fakeQueries, leadRequest } from '@/modules/teaching/booking/booking.fakes';
import { readerOf } from '@/common/settings/settings.fakes';
import { BookingParties } from './booking.parties';
import type { BookingQueries } from './booking.queries';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1, a docs/13 deviation): the lead path's new student
// carries contact_is_self into create_booking, which inserts it (migration 775).

const MIGRATION = '20261028000775_create_booking_contact_is_self';
const sql = readFileSync(migrationPath(`${MIGRATION}.sql`), 'utf8')
  .replace(/--.*$/gm, '');

function parties() {
  const queries = fakeQueries();
  queries.guardianByPhone.mockResolvedValue(null);
  return new BookingParties(queries as unknown as BookingQueries, readerOf(BookingSettings));
}

describe('booking: new student contact_is_self', () => {
  it('true is passed to new_student', async () => {
    const who = await parties().resolve(leadRequest({ newStudent: { name: 'ريم', tz: 'Asia/Riyadh', contact_is_self: true } }));
    expect(who.new_student).toMatchObject({ contact_is_self: true });
  });

  it('omitted stays omitted (the DB default false)', async () => {
    const who = await parties().resolve(leadRequest());
    expect(who.new_student).not.toHaveProperty('contact_is_self');
  });

  it('create_booking v7 inserts it, defaulting a missing value to false', () => {
    expect(sql).toMatch(/meeting_link_override, notes, contact_is_self, created_by\)/);
    expect(sql).toContain('coalesce(s.contact_is_self, false)');
    expect(sql).toContain('grant execute on function public.create_booking(jsonb, uuid) to service_role;');
  });
});
