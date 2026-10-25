import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { teacher } from './fixtures';
import { SalesTeacherHeader } from './SalesTeacherHeader';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const header = <SalesTeacherHeader teacher={teacher()} kind="active" onKind={() => undefined} />;

beforeEach(() => jest.mocked(router.push).mockReset());

test('in the sales tree «جدولها» opens the sales schedule tab (/sales/schedule)', async () => {
  await renderWithQuery(<TreeBaseProvider value="/sales">{header}</TreeBaseProvider>);
  await fireEvent.press(screen.getByRole('button', { name: t.sales.teachers.openSchedule }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/schedule', params: { teacherId: 't1' } });
});

test('in the admin / teacher trees (no provider) it opens «المزيد» › «المبيعات» (/more/sales/schedule)', async () => {
  await renderWithQuery(header);
  await fireEvent.press(screen.getByRole('button', { name: t.sales.teachers.openSchedule }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/more/sales/schedule', params: { teacherId: 't1' } });
});
