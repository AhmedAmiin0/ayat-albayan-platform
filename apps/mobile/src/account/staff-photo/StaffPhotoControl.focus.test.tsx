import { act, fireEvent, screen } from '@testing-library/react-native';
import { apiSend } from '@/core/lib/http/api';
import { focusNode } from '@/core/lib/a11y-focus';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { StaffPhotoControl } from './StaffPhotoControl';

jest.mock('@/core/lib/a11y-focus', () => ({ focusNode: jest.fn(() => true) }));
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiSend: jest.fn() }));

const s = t.staffPhoto;
const focused = jest.mocked(focusNode);

const show = () =>
  renderWithQuery(<StaffPhotoControl name="هدى سالم" id="t1" base="/teachers/t1/avatar" photo="https://cdn/t1.jpg" invalidate={[['teachers']]} />);
/** Whether `target` (what focusNode got) is the named button: the host Pressable shares its onClick with the screen's element. */
const isButton = (name: string) => (target: unknown) =>
  screen.getByRole('button', { name }).props.onClick === (target as { props: { onClick: unknown } }).props.onClick;

beforeEach(() => {
  jest.useFakeTimers();
  focused.mockClear();
});
afterEach(() => jest.useRealTimers());

test('nothing is focused on the first render', async () => {
  await show();
  await act(() => jest.advanceTimersByTime(200));
  expect(focused).not.toHaveBeenCalled();
});

test('«حذف الصورة» moves focus to the confirm; «إلغاء» gives it back to «تغيير الصورة»', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  await act(() => jest.advanceTimersByTime(200));
  expect(isButton(s.remove)(focused.mock.calls.at(-1)?.[0])).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  await act(() => jest.advanceTimersByTime(200));
  expect(isButton(s.change)(focused.mock.calls.at(-1)?.[0])).toBe(true);
});

test('confirming the remove also gives focus back to «تغيير الصورة»', async () => {
  jest.mocked(apiSend).mockResolvedValueOnce({ avatar_url: null });
  await show();
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  await act(() => jest.advanceTimersByTime(200));
  expect(isButton(s.change)(focused.mock.calls.at(-1)?.[0])).toBe(true);
});
