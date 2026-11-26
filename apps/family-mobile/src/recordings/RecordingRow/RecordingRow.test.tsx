import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { RecordingRow } from '@/recordings/RecordingRow';
import { rec, SARA } from '@/recordings/recordings.fixtures';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const F = t.lessonFiles;

test('one part, never heard: the new note only; a press opens the lesson page', async () => {
  await render(<RecordingRow row={rec('A', 'L1')} student={SARA} parts={1} />);
  expect(screen.getByText(F.isNew)).toBeTruthy();
  expect(screen.queryByText(F.parts.one)).toBeNull();
  expect(screen.getByText(/^فاطمة · .+ · 45 دقيقة$/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: F.recording }));
  expect(router.push).toHaveBeenCalledWith('/lesson/L1?student=s1');
});

test('a lesson recorded in two parts says so beside the new note', async () => {
  await render(<RecordingRow row={rec('A', 'L1')} student={SARA} parts={2} />);
  expect(screen.getByText(F.parts.two)).toBeTruthy();
  expect(screen.getByText(F.isNew)).toBeTruthy();
});
