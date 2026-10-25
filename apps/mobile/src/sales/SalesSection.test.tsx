import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { MoreScreen } from '@/more/MoreScreen';
import { SalesSection } from './SalesSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const only = (...keys: string[]) => (p: string) => keys.includes(p);
const row = (name: string) => screen.queryByRole('button', { name });

test('a salesperson (self.sales + self.sales_academy) gets the five rows, each opening its page', async () => {
  await render(<SalesSection can={only('self.sales', 'self.sales_academy')} />);
  expect(screen.getByRole('header', { name: t.sales.mobile.section })).toBeTruthy();
  const pages: [string, string][] = [
    [t.sales.nav.subscriptions, '/more/sales/subscriptions'],
    [t.sales.nav.allStudents, '/more/sales/students'],
    [t.sales.nav.teachers, '/more/sales/teachers'],
    [t.sales.nav.live, '/more/sales/live'],
    [t.sales.nav.academySchedule, '/more/sales/schedule'],
  ];
  for (const [name, href] of pages) {
    const button = row(name);
    expect(button).toBeTruthy();
    if (button) await fireEvent.press(button);
    expect(router.push).toHaveBeenLastCalledWith(href);
  }
});

test('self.sales alone keeps «الاشتراكات»; the academy rows need self.sales_academy', async () => {
  await render(<SalesSection can={only('self.sales')} />);
  expect(row(t.sales.nav.subscriptions)).toBeTruthy();
  expect(row(t.sales.nav.teachers)).toBeNull();
  expect(row(t.sales.nav.live)).toBeNull();
});

test('an admin (no self.* keys) never sees the section on «المزيد»', async () => {
  await render(<MoreScreen can={only('teachers.read', 'subscriptions.read', 'lessons.read')} />);
  expect(screen.queryByRole('header', { name: t.sales.mobile.section })).toBeNull();
  expect(row(t.sales.nav.live)).toBeNull();
});
