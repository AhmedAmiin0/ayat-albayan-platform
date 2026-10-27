import { formatPhone } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { myStudent } from '../testing/fixtures';
import { MyStudentItem } from './MyStudentItem';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('«طلابي»: the readable code and the guardian phone (LTR) beside my commission', async () => {
  await render(<MyStudentItem student={myStudent({ guardian_phone: '+201001112224' })} />);
  expect(screen.getByText(ltr('AB-1001'))).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone('+201001112224')))).toBeTruthy();
  expect(screen.getByText(`${t.assistantPortal.students.commission}:`)).toBeTruthy();
});

test('«طلابي»: no saved phone and no commission, no phone line', async () => {
  await render(<MyStudentItem student={myStudent({ commission: null })} />);
  expect(screen.getByText(ltr('AB-1001'))).toBeTruthy();
  expect(screen.queryByText(/\+/)).toBeNull();
});
