import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { earningsView, PAYMENTS } from './fixtures';
import { TeacherEarningsScreen } from './TeacherEarningsScreen';
import { egp } from './text';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));

const e = t.teacherEarnings;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/teachers/t1/earnings') return earningsView();
    if (path === '/teachers/t1/earnings/payments') return PAYMENTS;
    throw new Error(`unexpected ${path}`);
  });
});

test('title with her name, the three balance cards, status labels and the payment history', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  expect(await screen.findByRole('header', { name: e.titleFor.replace('{name}', 'أ. فاطمة') })).toBeTruthy();
  expect(screen.getByText(e.earned)).toBeTruthy();
  expect(screen.getByText(egp(240))).toBeTruthy(); // earned
  expect(screen.getByText(egp(90))).toBeTruthy(); // paid
  expect(screen.getByText(egp(150))).toBeTruthy(); // outstanding
  expect(screen.getByText(e.status.earned)).toBeTruthy();
  expect(screen.getByText(e.status.partially_paid)).toBeTruthy();
  expect(screen.getByText(e.status.paid)).toBeTruthy();
  expect(await screen.findByText(e.paymentLine.replace('{amount}', egp(90)).replace('{n}', '2'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/t1/earnings');
});

test('a settled session cannot be ticked; ticking shows the selected total and the count on the button', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  const boxes = await screen.findAllByRole('checkbox');
  // select-all, then e3, e2, e1 (newest first)
  expect(boxes).toHaveLength(4);
  expect(boxes[3]?.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(boxes[2] as (typeof boxes)[number]);
  expect(screen.getByText(e.selectedDue.replace('{amount}', egp(50)))).toBeTruthy();
  expect(screen.getByRole('button', { name: e.paySelected.replace('{n}', '1') })).toBeTruthy();
  await fireEvent.press(boxes[1] as (typeof boxes)[number]);
  expect(screen.getByText(e.selectedDue.replace('{amount}', egp(150)))).toBeTruthy();
});

test('select-all ticks every open session, again clears them', async () => {
  await renderWithQuery(<TeacherEarningsScreen />);
  await fireEvent.press(await screen.findByRole('checkbox', { name: e.selectAll }));
  expect(screen.getByRole('button', { name: e.paySelected.replace('{n}', '2') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('checkbox', { name: e.selectAll }));
  expect(screen.getByRole('button', { name: e.pay })).toBeTruthy();
  expect(screen.queryByText(e.selectedDue.replace('{amount}', egp(150)))).toBeNull();
});

test('nothing owed: the pay button is disabled', async () => {
  const settled = earningsView(earningsView().sessions.slice(2));
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('payments') ? [] : settled));
  await renderWithQuery(<TeacherEarningsScreen />);
  const pay = await screen.findByRole('button', { name: e.pay });
  expect(pay.props.accessibilityState).toMatchObject({ disabled: true });
  expect(await screen.findByText(e.paymentsEmpty)).toBeTruthy();
});

test('no sessions yet: the empty note', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('payments') ? [] : earningsView([])));
  await renderWithQuery(<TeacherEarningsScreen />);
  expect(await screen.findByText(e.empty)).toBeTruthy();
});
