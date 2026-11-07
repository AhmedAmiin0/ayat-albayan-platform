import { act, fireEvent, screen } from '@testing-library/react-native';

// Test-only: fill a lesson row (LessonTimesStep) through the mocked Expo dialogs (jest.setup.cjs).

type PickerConfirm = (event: unknown, at: Date) => void;

/** Confirms the open (mocked) Expo dialog with a phone-local Date. */
async function confirmDialog(at: Date) {
  const dialog = await screen.findByTestId('native-date-time-picker');
  const confirm = (dialog.props as { onValueChange: PickerConfirm }).onValueChange;
  await act(() => confirm({}, at));
}

/** Lesson row `index`: its date «YYYY-MM-DD» and its time «HH:MM» on the native dialogs. */
export async function pickLesson(index: number, wall: { date: string; time: string }) {
  const [y = 0, m = 1, d = 1] = wall.date.split('-').map(Number);
  const [h = 0, min = 0] = wall.time.split(':').map(Number);
  await fireEvent.press(await screen.findByTestId(`lesson-date-${index}`));
  await confirmDialog(new Date(y, m - 1, d, 12));
  await fireEvent.press(screen.getByTestId(`lesson-time-${index}`));
  await confirmDialog(new Date(2000, 0, 1, h, min));
}
