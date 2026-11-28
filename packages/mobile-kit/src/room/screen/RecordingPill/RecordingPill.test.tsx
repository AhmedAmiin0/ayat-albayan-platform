import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { RecordingPill } from './RecordingPill';

test('reads the recording notice and the time since it started', async () => {
  await render(<RecordingPill elapsed="04:12" />);
  expect(screen.getByTestId('room-recording')).toBeTruthy();
  expect(screen.getByText(t.classroom.recordingNow)).toBeTruthy();
  expect(screen.getByRole('timer')).toHaveTextContent('04:12', { exact: false });
});

test('with no time yet, only the notice shows', async () => {
  await render(<RecordingPill elapsed={null} />);
  expect(screen.getByText(t.classroom.recordingNow)).toBeTruthy();
  expect(screen.queryByRole('timer')).toBeNull();
});
