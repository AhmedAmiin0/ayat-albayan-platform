import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import TodayRoute from '../../app/(tabs)/index';

beforeEach(() => {
  // Thursday 1 Oct 2026, 15:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T12:20:00Z') });
});
afterEach(() => jest.useRealTimers());

test('Amiri «النهارده» header with the Riyadh date line in Western digits', async () => {
  await render(<TodayRoute />);
  expect(screen.getByRole('header', { name: t.mobile.today })).toBeTruthy();
  expect(screen.getByText('الخميس 1 أكتوبر 2026. المواعيد بتوقيت الرياض')).toBeTruthy();
});

test('no lessons API yet: an honest empty state, no dead buttons', async () => {
  await render(<TodayRoute />);
  expect(screen.getByRole('header', { name: t.common.empty })).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
