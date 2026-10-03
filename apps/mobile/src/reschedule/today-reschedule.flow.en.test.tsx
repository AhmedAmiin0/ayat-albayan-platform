import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { LOCALE_STORAGE_KEY } from '@ab/shared';
import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { calendarBackend, NOW } from '@/calendar/flow-backend';

// An English run: LTR native flag and English saved, so the boot gate does not reload.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

beforeEach(async () => {
  await resetApp();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('English: Today card → reschedule this lesson only → the body, the confirmation and the done text', async () => {
  const { backend } = calendarBackend();
  await renderApp({ url: '/', backend, storage: { [LOCALE_STORAGE_KEY]: 'en' } });
  const [card] = await screen.findAllByRole('button', { name: en.lessons.rescheduleSubmit });
  if (!card) throw new Error('no reschedule on the card');
  await fireEvent.press(card);
  expect(await screen.findByRole('header', { name: en.lessons.rescheduleTitle })).toBeTruthy();
  expect(screen.getByRole('radio', { name: en.lessons.scope.one, checked: true })).toBeTruthy();

  await fireEvent.press(await screen.findByRole('radio', { name: /^Sunday 4 October/ }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  const submit = screen.getAllByRole('button', { name: en.lessons.rescheduleSubmit }).at(-1);
  if (!submit) throw new Error('no submit in the sheet');
  await fireEvent.press(submit);

  expect(await screen.findByText(en.lessons.rescheduled)).toBeTruthy();
  expect(screen.getByText(en.reschedule.guardianNote)).toBeTruthy();
  expect(backend.sent('POST /lessons/:id/reschedule')[0]?.body).toEqual({
    scope: 'one',
    startsAt: '2026-10-04T14:00:00.000Z',
  });
  await fireEvent.press(screen.getByRole('button', { name: en.reschedule.done }));
  expect(screen.queryByRole('header', { name: en.lessons.rescheduleTitle })).toBeNull();
});
