import en from '@ab/shared/i18n/en.json';
import { formatPhone } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { ltr } from '@/core/ui/primitives/Ltr';
import { student } from '../testing/fixtures';
import { AllStudentRow } from './AllStudentRow';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English (LTR) row: code and phone readable, the chat hint in en.json', async () => {
  expect(t).toEqual(en);
  expect(I18nManager.isRTL).toBe(false);
  await render(<TreeBaseProvider value="/sales"><AllStudentRow student={student()} /></TreeBaseProvider>);
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone('+201001112223')))).toBeTruthy();
  expect(screen.getByRole('button').props.accessibilityHint).toBe(en.sales.allStudents.chatHint);
});

test('an English (LTR) row with no phone: the note in en.json', async () => {
  await render(<TreeBaseProvider value="/sales"><AllStudentRow student={student({ guardian_phone: null })} /></TreeBaseProvider>);
  await fireEvent.press(screen.getByRole('button'));
  expect(screen.getByText(en.sales.allStudents.noPhone)).toBeTruthy();
});
