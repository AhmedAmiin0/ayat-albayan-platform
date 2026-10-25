import { render, screen } from '@testing-library/react-native';
import { huda } from '@/inbox/shared/fixtures';
import { ContactStep } from './ContactStep';
import { draftFromLead } from './draft';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the quick trial’s first step asks the registration form’s questions in English', async () => {
  await render(
    <ContactStep
      value={draftFromLead(huda)}
      withDuration
      onChange={jest.fn()}
      onNext={jest.fn()}
    />,
  );
  for (const label of [
    'Student name',
    "Student's age",
    'Guardian name',
    'WhatsApp number (with country code)',
  ]) {
    expect(screen.getByLabelText(label)).toBeTruthy();
  }
  expect(
    screen.getByText(
      'Start with your country code, then your number — Saudi Arabia 966 · Egypt 20 · Sudan 249',
    ),
  ).toBeTruthy();
  expect(screen.getByRole('radio', { name: '45 minutes', checked: true })).toBeTruthy();
  expect(
    screen.getByText("Length of one lesson — not sure? Leave it and we'll count 45 minutes"),
  ).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Facebook ad', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Friend or acquaintance' })).toBeTruthy();
  expect(screen.getByText('How did you hear about us?')).toBeTruthy();
});
