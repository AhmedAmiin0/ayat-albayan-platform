import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { fakeDb } from '../../guardians/fake-db';
import { TeachersSettings } from '../teachers.settings';
import { AvailabilityQueries } from './availability.queries';
import { allDayRows } from './free-slots';

const ROW = { id: 'a1', weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: 'Africa/Cairo' };
const setup = (on: boolean) => {
  const f = fakeDb({ teacher_availability: [{ data: [ROW] }] });
  const q = new AvailabilityQueries(f.db, readerOf(TeachersSettings, { teachers_always_available: on }));
  const touched = () => f.calls.filter((c) => c.table === 'teacher_availability');
  return { q, touched };
};

describe('AvailabilityQueries.bookableSlots (settings.teachers_always_available)', () => {
  it('on: every day 00:00–24:00 Riyadh, without reading the saved grid', async () => {
    const { q, touched } = setup(true);
    expect(await q.bookableSlots('T')).toEqual(allDayRows('Asia/Riyadh'));
    expect(touched()).toEqual([]);
  });

  it('off: the saved grid, as listSlots returns it', async () => {
    const { q, touched } = setup(false);
    expect(await q.bookableSlots('T')).toEqual([{ ...ROW, start_time: '16:00', end_time: '18:00' }]);
    expect(touched()).toContainEqual({ table: 'teacher_availability', method: 'eq', args: ['teacher_id', 'T'] });
  });

  it('the editors keep the real rows either way (listSlots ignores the switch)', async () => {
    const { q } = setup(true);
    expect(await q.listSlots('T')).toEqual([{ ...ROW, start_time: '16:00', end_time: '18:00' }]);
  });
});
