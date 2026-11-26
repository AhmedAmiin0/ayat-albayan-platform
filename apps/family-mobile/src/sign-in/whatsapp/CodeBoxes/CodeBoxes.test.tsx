import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { CODE_LENGTH } from '@ab/client-core';
import { CodeBoxes } from './CodeBoxes';

const onChange = jest.fn();
const show = (value: string, refused = false) =>
  render(<CodeBoxes value={value} onChange={onChange} refused={refused} />);
const boxes = () => screen.getAllByTestId('code-box', { includeHiddenElements: true });
const widths = () => boxes().map((b) => b.props.style.borderWidth);

beforeEach(() => jest.clearAllMocks());

test('six boxes show the typed digits in order', async () => {
  await show('12');
  expect(boxes()).toHaveLength(CODE_LENGTH);
  expect(screen.getByText('1', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('2', { includeHiddenElements: true })).toBeTruthy();
});

test('a pasted code is cut to its digits before it is handed over', async () => {
  await show('');
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '12-34 56 7');
  expect(onChange).toHaveBeenCalledWith('123456');
});

test('focused: only the next box is marked; blurred: none', async () => {
  await show('12');
  expect(widths()).toEqual([1, 1, 2, 1, 1, 1]);
  await fireEvent(screen.getByLabelText(t.familyAuth.code), 'blur');
  expect(widths()).toEqual([1, 1, 1, 1, 1, 1]);
  await fireEvent(screen.getByLabelText(t.familyAuth.code), 'focus');
  expect(widths()).toEqual([1, 1, 2, 1, 1, 1]);
});

test('a full code marks the last box; a refused try marks them all', async () => {
  await show('123456');
  expect(widths()).toEqual([1, 1, 1, 1, 1, 2]);
  await show('123456', true);
  expect(widths()).toEqual([2, 2, 2, 2, 2, 2]);
});
