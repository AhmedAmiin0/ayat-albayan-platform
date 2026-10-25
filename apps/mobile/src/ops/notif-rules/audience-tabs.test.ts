import { t } from '@/core/lib/i18n/i18n';
import { catalogue } from '../fixtures';
import { audienceTabs, rowsOf } from './audience-tabs';

const c = t.notificationCatalogue;

test('the pills follow the web order, with their counts, «يدوي» last', () => {
  const tabs = audienceTabs(catalogue.entries);
  expect(tabs.map((x) => x.label)).toEqual([c.audience.guardian, c.audience.teacher, c.audience.lead, c.audience.staff, c.states.manual]);
  expect(tabs.reduce((sum, x) => sum + x.count, 0)).toBe(catalogue.entries.length);
});

test('a manual row is only under «يدوي», never under its audience', () => {
  const guardian = rowsOf(catalogue.entries, 'guardian').map((e) => e.key);
  expect(guardian).toContain('booking_confirmation');
  expect(guardian).not.toContain('lesson_join_link_manual');
  expect(rowsOf(catalogue.entries, 'manual').map((e) => e.key)).toContain('lesson_join_link_manual');
});

test('no manual rows: no «يدوي» pill', () => {
  const tabs = audienceTabs(catalogue.entries.filter((e) => !e.manual));
  expect(tabs.map((x) => x.value)).toEqual(['guardian', 'teacher', 'lead', 'staff']);
});
