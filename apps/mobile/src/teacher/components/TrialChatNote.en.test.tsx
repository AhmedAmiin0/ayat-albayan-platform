import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TrialChatNote } from './TrialChatNote';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('an English run: the trial note reads from en.json', async () => {
  expect(t).toEqual(en);
  await render(<TrialChatNote status="trial" />);
  expect(screen.getByText('Contact with a trial student’s family goes through sales.')).toBeTruthy();
});

test('no note for a non-trial or unknown status', async () => {
  await render(<TrialChatNote status="paused" />);
  expect(screen.queryByTestId('trial-chat-note')).toBeNull();
});
