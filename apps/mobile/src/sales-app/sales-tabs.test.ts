import type { Permission } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { salesTabItems } from './sales-tabs';

const holds = (...keys: Permission[]) => (p: Permission) => keys.includes(p);
const shown = (can: (p: Permission) => boolean) => salesTabItems(can).filter((tab) => !tab.hidden).map((tab) => tab.name);

test('the full sales role: chats, students, schedule, more, in the web SalesNav order', () => {
  const tabs = salesTabItems(holds('inbox.read', 'self.sales', 'self.sales_academy', 'self.sales_earnings'), '3');
  expect(tabs.map((tab) => tab.title)).toEqual([t.sales.nav.chats, t.sales.nav.allStudents, t.sales.nav.academySchedule, t.mobile.more]);
  expect(tabs.every((tab) => !tab.hidden)).toBe(true);
  expect(tabs[0]?.badge).toBe('3');
});

test('without self.sales_academy: no students or schedule tab', () => {
  expect(shown(holds('inbox.read', 'self.sales'))).toEqual(['inbox', 'more']);
});

test('without inbox.read: no chats tab; «المزيد» always stays', () => {
  expect(shown(holds('self.sales_academy'))).toEqual(['students', 'schedule', 'more']);
  expect(shown(() => false)).toEqual(['more']);
});
