import { act, fireEvent, screen } from '@testing-library/react-native';

// Test-only: the mocked Expo DateTimePicker (jest.setup.cjs) opened from a field and confirmed.

interface DialogProps {
  onValueChange: (event: unknown, at: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/** The open dialog's props (bounds, confirm). */
export const dialogProps = async (): Promise<DialogProps> =>
  (await screen.findByTestId('native-date-time-picker')).props as DialogProps;

/** Opens the date field `testID` and confirms «YYYY-MM-DD» (the phone-local noon). */
export async function pickDay(testID: string, day: string) {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number);
  await fireEvent.press(await screen.findByTestId(testID));
  const { onValueChange } = await dialogProps();
  await act(() => onValueChange({}, new Date(y, m - 1, d, 12)));
}

/** «YYYY-MM-DD» of a bound the dialog got (phone-local). */
export const dayOf = (at: Date | undefined): string =>
  at ? [at.getFullYear(), at.getMonth() + 1, at.getDate()].map((n) => String(n).padStart(2, '0')).join('-') : '';
