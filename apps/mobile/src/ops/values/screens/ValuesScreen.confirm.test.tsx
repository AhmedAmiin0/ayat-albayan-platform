import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { settings } from '../../shared/fixtures';
import { groupLabel } from '../lib/value-groups';
import { labelOf } from '../lib/value-text';
import { valuesAnswer, WRITER } from '../testing/values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(valuesAnswer(WRITER));
  mockApiSend.mockResolvedValue(settings);
});

const open = async (group: 'retention' | 'schedule', label: string) => {
  await renderWithQuery(<ValuesScreen />);
  await screen.findByText(labelOf('booking_horizon_weeks'));
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(groupLabel(group).replace(/[()]/g, '.')) }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`«${label}»`) }));
};

test('«مدة الاحتفاظ بسجل النشاط» asks to type the number of days before it saves', async () => {
  await open('retention', labelOf('activity_retention_days'));
  await fireEvent.changeText(screen.getByLabelText(labelOf('activity_retention_days')), '30');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  expect(screen.getByText(t.mobileValues.typedConfirm.replace('{n}', '30'))).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.mobileValues.typedLabel), '31');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(await screen.findByText(t.mobileValues.typedMismatch)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.mobileValues.typedLabel), '٣٠');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { activityRetentionDays: 30 }),
  );
});

test('«كل المعلمين متاحون» asks a plain question; «إلغاء» there sends nothing', async () => {
  await open('schedule', labelOf('teachers_always_available'));
  const on = !settings.teachers_always_available;
  const m = t.mobileAdmin.settings;
  await fireEvent.press(screen.getByRole('radio', { name: on ? m.on : m.off }));
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  expect(screen.getByText(t.mobileValues.plainConfirm)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.mobileValues.plainConfirm)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { teachersAlwaysAvailable: on }),
  );
});

test('«الإلغاء المتأخر» can be turned on and sends the hours', async () => {
  await open('schedule', labelOf('late_cancel_hours'));
  await fireEvent.press(screen.getByRole('radio', { name: t.mobileAdmin.settings.on }));
  await fireEvent.changeText(screen.getByLabelText(labelOf('late_cancel_hours')), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { lateCancelHours: 12 }));
});
