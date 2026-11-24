import { formatPhone } from '@ab/core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t, ltr } from '@ab/mobile-kit';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { myStudent } from '@/sales-money/testing/fixtures';
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

test('the sales tree: a row tap opens the student chat, in its chat group, with no tab anchor', async () => {
  await render(
    <TreeBaseProvider value="/sales">
      <MyStudentItem student={myStudent({ commission: null })} />
    </TreeBaseProvider>,
  );
  await fireEvent.press(screen.getByText(new RegExp(t.assistantPortal.students.broughtAt)));
  expect(router.push).toHaveBeenCalledWith(`/sales/students/channel/${myStudent().id}`);
});
