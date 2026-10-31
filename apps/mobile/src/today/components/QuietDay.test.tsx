import { setViewerPersonTz } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import type { TodayLesson } from '../lib/today-lesson';
import type { TodaySource } from '../lib/today-source';
import { QuietDay } from './QuietDay';

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ router: { navigate: (h: unknown) => mockNavigate(h) } }));

// Nothing booked tomorrow: only «جدول الغد» and the day it opens matter here.
const empty = { data: [], isError: false, isPending: false, isRefetching: false, dataUpdatedAt: 0, refetch: jest.fn() };
const source = (schedule: TodaySource<TodayLesson>['schedule']): TodaySource<TodayLesson> => ({
  tree: schedule === '/schedule' ? 'admin' : 'sales',
  useDay: () => empty,
  schedule,
});
// 23:30 on Sunday 4 Oct in Cairo (UTC+2) is already 00:30 on Monday the 5th in Riyadh (UTC+3).
const lateInCairo = new Date('2026-10-04T21:30:00.000Z');

beforeEach(() => {
  mockNavigate.mockClear();
  setViewerPersonTz('Africa/Cairo');
});
afterEach(() => setViewerPersonTz('Asia/Riyadh'));

const tapTomorrow = async (schedule: TodaySource<TodayLesson>['schedule']) => {
  await render(<QuietDay now={lateInCairo} source={source(schedule)} />);
  await fireEvent.press(screen.getByRole('button', { name: t.today.tomorrowSchedule }));
};

test('the admin «جدول الغد» opens the viewer’s tomorrow: «الجدول» pages by her days', async () => {
  await tapTomorrow('/schedule');
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/schedule', params: { date: '2026-10-05' } });
});

test('the salesperson’s «جدول الغد» stays on Riyadh days, as «جدول الحلقات» pages', async () => {
  await tapTomorrow('/sales/schedule');
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/sales/schedule', params: { date: '2026-10-06' } });
});
