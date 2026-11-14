import { DEFAULT_HOME_PREFS, withAlert } from '@ab/client-core';
import type { NotificationsPage } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { held, later, NOW } from '@/teacher/today/testing/day-fixtures';
import { resetHomePrefs, saveHomePrefs } from './home-prefs';
import { TodayAlerts } from './TodayAlerts';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn(() => Promise.resolve(undefined));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...(a as [])),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const PAGE: NotificationsPage = {
  items: [{ id: 'n-1', kind: 'new_student', title: 'طالب جديد', body: 'سهيلة', data: {},
    created_at: '2026-10-01T12:00:00.000Z', read_at: null }],
  total: 1, page: 1, pageSize: 20, unread: 1,
};

async function mount() {
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/me/notifications') ? PAGE : []));
  const onOpen = jest.fn();
  const onReport = jest.fn();
  await renderWithQuery(
    <TodayAlerts lessons={[held, later]} now={NOW} tz="UTC" onOpen={onOpen} onReport={onReport} />,
  );
  return { onOpen, onReport };
}

afterEach(async () => {
  resetHomePrefs();
  await AsyncStorage.clear();
});

test('her alerts: the report to write, the lesson to confirm, the bell row; one action each', async () => {
  const { onOpen, onReport } = await mount();
  expect(await screen.findByText('طالب جديد')).toBeTruthy();
  await fireEvent.press(screen.getByText(t.reports.open));
  expect(onReport).toHaveBeenCalledWith('held');
  await fireEvent.press(screen.getByText(t.teacherAlerts.open));
  expect(onOpen).toHaveBeenCalledWith(later);
});

test('a kind switched off stays out; none left says «لا تنبيهات اليوم»', async () => {
  const kinds = ['report', 'confirm', 'bell'] as const;
  const none = kinds.reduce((p, k) => withAlert(p, k, false), DEFAULT_HOME_PREFS);
  saveHomePrefs(none);
  await mount();
  expect(await screen.findByText(t.teacherAlerts.empty)).toBeTruthy();
});

test('«تخصيص» opens the customize screen', async () => {
  await mount();
  await fireEvent.press(screen.getByText(t.teacherAlerts.customize));
  expect(router.push).toHaveBeenCalledWith('/teacher/today/customize');
});

test('a bell row is marked read through the bell API', async () => {
  await mount();
  await fireEvent.press(await screen.findByText(t.teacherAlerts.markRead));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: ['n-1'] }),
  );
});
