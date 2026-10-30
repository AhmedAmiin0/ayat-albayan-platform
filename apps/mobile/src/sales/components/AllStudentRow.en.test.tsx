import en from '@ab/shared/i18n/en.json';
import { formatPhone } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
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

test('an English (LTR) row: code and phone readable, the details hint in en.json', async () => {
  expect(t).toEqual(en);
  expect(I18nManager.isRTL).toBe(false);
  await render(<TreeBaseProvider value="/sales"><AllStudentRow student={student()} /></TreeBaseProvider>);
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone('+201001112223')))).toBeTruthy();
  expect(screen.getByRole('button').props.accessibilityHint).toBe(en.sales.allStudents.detailsHint);
});

test('an English (LTR) row with no phone in the admin tree: the same details hint, the tap opens the student file', async () => {
  await render(<AllStudentRow student={student({ guardian_phone: null })} />);
  expect(screen.getByRole('button').props.accessibilityHint).toBe(en.sales.allStudents.detailsHint);
  await fireEvent.press(screen.getByRole('button'));
  expect(router.push).toHaveBeenCalledWith('/students/st1');
});
