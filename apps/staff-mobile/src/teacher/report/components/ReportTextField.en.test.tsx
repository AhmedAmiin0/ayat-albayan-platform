import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReportTextField } from './ReportTextField';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the free text follows what is typed, never a pinned side', async () => {
  await render(<ReportTextField label="Homework" value="Revise Al-Mulk" onChange={jest.fn()} />);
  const style = StyleSheet.flatten(screen.getByLabelText('Homework').props.style);
  expect(style.textAlign).toBeUndefined();
  expect(style.writingDirection).toBeUndefined();
  expect(style.textAlignVertical).toBe('top');
});
