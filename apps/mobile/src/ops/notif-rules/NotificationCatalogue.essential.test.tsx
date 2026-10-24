import { ESSENTIAL_OFF_TEXT } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { NotificationCatalogue } from '../NotificationCatalogue';
import { answer, catalogueV2, MANAGER, openAudience } from './rules-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
// The test renderer has no native tags: a mounted title gets one here.
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: (x: unknown) => (x ? 42 : null),
}));

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;
const name = c.entries.booking_confirmation.name;
const typedLabel = r.typedLabel.replace('{word}', ESSENTIAL_OFF_TEXT);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer(catalogueV2, MANAGER));
  mockApiSend.mockResolvedValue({});
});

const switchOff = async () => {
  await renderWithQuery(<NotificationCatalogue />);
  const sw = await screen.findByRole('switch', { name: r.switchLabel.replace('{name}', name) });
  await fireEvent(sw, 'valueChange', false);
};

const turnOff = () => screen.getByRole('button', { name: r.turnOff });

test('switching off an essential row opens the sheet; the button waits for the exact word', async () => {
  await switchOff();
  expect(screen.getByTestId('essential-sheet')).toBeTruthy();
  expect(screen.getByText(r.essentialTitle.replace('{name}', name))).toBeTruthy();
  expect(turnOff().props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.changeText(screen.getByLabelText(typedLabel), ESSENTIAL_OFF_TEXT.slice(0, -1));
  expect(turnOff().props.accessibilityState).toMatchObject({ disabled: true });
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(typedLabel), ESSENTIAL_OFF_TEXT);
  expect(turnOff().props.accessibilityState).toMatchObject({ disabled: false });
  await fireEvent.press(turnOff());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/booking_confirmation', {
    enabled: false,
    confirmText: ESSENTIAL_OFF_TEXT,
  });
  expect(await screen.findByText(r.savedOff.replace('{name}', name))).toBeTruthy();
  expect(screen.queryByTestId('essential-sheet')).toBeNull();
});

test('on open the screen reader moves to the sheet title (Android has no accessibilityViewIsModal)', async () => {
  const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  await switchOff();
  await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
  expect(focus).toHaveBeenCalledWith(42);
});

test('«إلغاء» closes the sheet without a request', async () => {
  await switchOff();
  await fireEvent.press(screen.getByRole('button', { name: r.cancel }));
  expect(screen.queryByTestId('essential-sheet')).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a 428 from the sheet keeps it open and says to type the word', async () => {
  mockApiSend.mockRejectedValue(new ApiError(428, { message: 'confirmation_required' }));
  await switchOff();
  await fireEvent.changeText(screen.getByLabelText(typedLabel), ESSENTIAL_OFF_TEXT);
  await fireEvent.press(turnOff());
  expect(await screen.findByText(r.errors.confirmation_required)).toBeTruthy();
  expect(screen.getByTestId('essential-sheet')).toBeTruthy();
});

test('a 428 for a row this build saw as plain opens the typed sheet', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(428, { message: 'confirmation_required' }));
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.teacher);
  const teacher = c.entries.teacher_lesson_reminder.name;
  await fireEvent(await screen.findByRole('switch', { name: r.switchLabel.replace('{name}', teacher) }), 'valueChange', false);
  expect(await screen.findByTestId('essential-sheet')).toBeTruthy();
  expect(screen.queryByText(r.errors.confirmation_required)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(typedLabel), ESSENTIAL_OFF_TEXT);
  await fireEvent.press(turnOff());
  expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', '/admin/notifications/teacher_lesson_reminder', {
    enabled: false,
    confirmText: ESSENTIAL_OFF_TEXT,
  });
});
