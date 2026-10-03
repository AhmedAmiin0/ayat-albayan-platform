import { render, screen } from '@testing-library/react-native';
import { answered, pending } from './fixtures';
import { AverageCard } from './AverageCard';
import { FeedbackRow } from './FeedbackRow';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the feedback rows and the average read in English', async () => {
  await render(<FeedbackRow row={answered} />);
  expect(screen.getByText('5 out of 5 · Yes')).toBeTruthy();
  expect(screen.getByText(/Free trial lesson/)).toBeTruthy();
});

test('a pending request and an average in English', async () => {
  await render(<FeedbackRow row={pending} />);
  expect(screen.getByText('Not answered yet')).toBeTruthy();
  await render(
    <AverageCard name="Abrar" average={{ avg_rating: 4.5, n: 12, recommend_yes_pct: 83.3 }} />,
  );
  expect(screen.getByText('4.5 out of 5 · 12 responses')).toBeTruthy();
  expect(screen.getByText('83% would recommend us')).toBeTruthy();
});
