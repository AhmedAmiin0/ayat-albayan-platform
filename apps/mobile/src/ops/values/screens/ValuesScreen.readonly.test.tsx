import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { groupLabel } from '../lib/value-groups';
import { labelOf } from '../lib/value-text';
import { READER, valuesAnswer, WRITER } from '../testing/values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

const chip = (id: Parameters<typeof groupLabel>[0]) =>
  screen.getByRole('radio', { name: new RegExp(groupLabel(id).replace(/[()]/g, '.')) });

test('without settings.write: an info note, and the sheet has no editor or «احفظ»', async () => {
  mockApiFetch.mockImplementation(valuesAnswer(READER));
  await renderWithQuery(<ValuesScreen />);
  expect(await screen.findByText(t.mobileValues.readOnly)).toBeTruthy();
  await fireEvent.press(
    await screen.findByRole('button', { name: `${labelOf('booking_horizon_weeks')}: 5` }),
  );
  expect(screen.getByText(t.settings.hints.bookingHorizonWeeks)).toBeTruthy();
  expect(screen.queryByLabelText(labelOf('booking_horizon_weeks'))).toBeNull();
  expect(screen.queryByRole('button', { name: t.config.custom.save })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('owned keys are read-only with «تُدار من صفحة أخرى», even with settings.write', async () => {
  mockApiFetch.mockImplementation(valuesAnswer(WRITER));
  await renderWithQuery(<ValuesScreen />);
  await screen.findByText(labelOf('booking_horizon_weeks'));
  expect(screen.queryByText(t.mobileValues.readOnly)).toBeNull();
  await fireEvent.press(chip('notifications'));
  const label = labelOf('follow_up_hours');
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${label}: `) }));
  expect(screen.getByText(t.mobileValues.owned)).toBeTruthy();
  expect(screen.getAllByText(`24${t.common.listSeparator}72`).length).toBeGreaterThan(1);
  expect(screen.queryByRole('button', { name: t.config.custom.save })).toBeNull();
});

test('a multi-field value says «عدّلها من الموقع»', async () => {
  mockApiFetch.mockImplementation(valuesAnswer(WRITER));
  await renderWithQuery(<ValuesScreen />);
  await screen.findByText(labelOf('booking_horizon_weeks'));
  await fireEvent.press(chip('academy'));
  const label = labelOf('academy_contact');
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${label}: `) }));
  expect(screen.getByText(t.mobileValues.editOnWeb)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.config.custom.save })).toBeNull();
});
