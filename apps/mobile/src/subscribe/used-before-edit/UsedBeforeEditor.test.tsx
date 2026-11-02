import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { PATH, press, show, stateOf, SUB } from './test-util';

// The open editor: bounds from GET …/lessons-used-before, «حفظ» only for a change.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const e = t.salesMoney.usedBeforeEdit;
const m = t.salesMoney;
const saveButton = () => screen.getByRole('button', { name: e.save });

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(stateOf());
  mockApiSend.mockReset().mockResolvedValue(undefined);
});

test('starts at the stored number, stops at the server max; «حفظ» disabled while unchanged', async () => {
  await show();
  await press(e.action);
  expect(await screen.findByLabelText(`${m.usedBefore}: 1`)).toBeTruthy();
  expect(saveButton().props.accessibilityState.disabled).toBe(true);
  for (let i = 0; i < 8; i += 1) await press(m.usedBeforeMore);
  expect(screen.getByLabelText(`${m.usedBefore}: 5`)).toBeTruthy();
  expect(saveButton().props.accessibilityState.disabled).toBe(false);
});

test('a save sends the number, closes and says «saved»', async () => {
  await show();
  await press(e.action);
  await screen.findByLabelText(`${m.usedBefore}: 1`);
  await press(m.usedBeforeMore);
  await press(e.save);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', PATH, { lessonsUsedBefore: 2 }));
  expect(await screen.findByText(e.saved)).toBeTruthy();
  expect(screen.queryByTestId('used-before-editor')).toBeNull();
});

test('a future start, stored 2 and max 0: starts at 0 and saves 0', async () => {
  mockApiFetch.mockResolvedValue(stateOf({ lessons_used_before: 2, max: 0 }));
  await show({ ...SUB, starts_on: '2999-01-01', lessons_used_before: 2 });
  await press(e.action);
  expect(await screen.findByLabelText(`${m.usedBefore}: 0`)).toBeTruthy();
  await press(e.save);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', PATH, { lessonsUsedBefore: 0 }));
});

test('a 409 from the save: its words, the editor stays open', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'used_before_changed' }));
  await show();
  await press(e.action);
  await screen.findByLabelText(`${m.usedBefore}: 1`);
  await press(m.usedBeforeLess);
  await press(e.save);
  expect(await screen.findByText(e.errors.used_before_changed)).toBeTruthy();
  expect(screen.getByTestId('used-before-editor')).toBeTruthy();
});

test('an unknown failure: the generic line', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await show();
  await press(e.action);
  await screen.findByLabelText(`${m.usedBefore}: 1`);
  await press(m.usedBeforeLess);
  await press(e.save);
  expect(await screen.findByText(e.errors.generic)).toBeTruthy();
});
