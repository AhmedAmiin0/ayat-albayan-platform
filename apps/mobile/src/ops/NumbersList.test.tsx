import { formatPhone } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { numbers, parityDiff, parityOk } from './numbers-fixtures';
import { NumbersList } from './NumbersList';
import { NUMBERS_PATH, PARITY_PATH } from './use-numbers';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const n = t.numbers;
const answer = (list: unknown, parity: unknown) => async (p: string) =>
  p === NUMBERS_PATH ? list : p === PARITY_PATH ? parity : Promise.reject(new Error(`unexpected ${p}`));

beforeEach(() => jest.clearAllMocks());

test('two numbers with parity ok: source, parity, rows with role, phone, chips and health; nothing to press', async () => {
  mockApiFetch.mockImplementation(answer(numbers, parityOk));
  await renderWithQuery(<NumbersList />);
  expect(await screen.findByText('Main line')).toBeTruthy();
  expect(screen.getByText(n.source.current.replace('{{source}}', n.source.legacy))).toBeTruthy();
  expect(screen.getByText(n.mobile.parityOk)).toBeTruthy();
  expect(screen.getByText(`${n.purpose.notifications} · ${ltr(formatPhone('+15550001111'))}`)).toBeTruthy();
  expect(screen.getByText(`${n.purpose.chat} · ${n.chips.notChecked}`)).toBeTruthy();
  expect(screen.getByText(n.chips.enabled)).toBeTruthy();
  expect(screen.getByText(n.chips.disabled)).toBeTruthy();
  expect(screen.getByText(n.chips.default)).toBeTruthy();
  expect(screen.getByText(n.health.ok)).toBeTruthy();
  expect(screen.getByText(n.mobile.note)).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
});

test('differences show their count; the module source is named', async () => {
  mockApiFetch.mockImplementation(answer(numbers, parityDiff));
  await renderWithQuery(<NumbersList />);
  expect(await screen.findByText(n.mobile.parityDiff.replace('{{count}}', '2'))).toBeTruthy();
  expect(screen.getByText(n.source.current.replace('{{source}}', n.source.module))).toBeTruthy();
});

test('no numbers yet says so', async () => {
  mockApiFetch.mockImplementation(answer([], parityOk));
  await renderWithQuery(<NumbersList />);
  expect(await screen.findByText(n.empty)).toBeTruthy();
});

test('a failed read says so and retries', async () => {
  mockApiFetch.mockImplementation(answer(Promise.reject(new Error('down')), parityOk));
  await renderWithQuery(<NumbersList />);
  expect(await screen.findByText(n.loadError)).toBeTruthy();
  mockApiFetch.mockImplementation(answer(numbers, parityOk));
  fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('Main line')).toBeTruthy();
  expect(screen.queryByText(n.loadError)).toBeNull();
});
