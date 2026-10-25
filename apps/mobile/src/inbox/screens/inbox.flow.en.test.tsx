import { LOCALE_STORAGE_KEY } from '@ab/shared';
import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderApp, resetApp } from '@/test/app-router';
import { inboxBackend } from '../shared/flow-backend';
import { PHONE } from '../shared/thread-fixtures';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default) and English
// is the saved language, so the boot gate does not reload.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

beforeEach(resetApp);

test('English: tags, thread, reply and the closed-session template sheet use the en.json words', async () => {
  const { backend } = inboxBackend();
  const app = await renderApp({ url: '/inbox', backend, storage: { [LOCALE_STORAGE_KEY]: 'en' } });
  const row = within(await screen.findByRole('button', { name: /هدى سالم/ }));
  expect(row.getByText(en.enums.leadStatus.new)).toBeTruthy();
  expect(row.getByText(en.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(screen.getByText(en.inbox.kind.guardian)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: /هدى سالم/ }));
  await fireEvent.changeText(await screen.findByLabelText(en.inbox.composer.placeholder), 'Hello Huda');
  await fireEvent.press(screen.getByRole('button', { name: en.inbox.composer.send }));
  await waitFor(() => expect(backend.sent('POST /threads/:phone/text')).toHaveLength(1));
  expect(backend.sent('POST /threads/:phone/text')[0]?.body).toMatchObject({ text: 'Hello Huda' });
  expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`);

  await fireEvent.press(screen.getByRole('button', { name: en.common.back }));
  await fireEvent.press(await screen.findByRole('button', { name: /أم يوسف/ }));
  expect(await screen.findByText(en.inbox.sessionClosed)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.inbox.composer.sendTemplate })).toBeTruthy();
});
