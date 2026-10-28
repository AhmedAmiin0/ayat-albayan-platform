import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from './ButtonRow';

const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 48, x: 0, y: 0 } } });
const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
const cells = () => screen.getAllByTestId('button-row-cell').map((c) => StyleSheet.flatten(c.props.style));

const row = (
  <ButtonRow testID="row">
    <Button variant="secondary" label="تغيير الموعد" onPress={jest.fn()} />
    {null}
    <Button variant="danger" label="إلغاء الحلقة" onPress={jest.fn()} />
  </ButtonRow>
);

// jest-expo's window reports fontScale 2: start every test at the default 1.
const mockFontScale = jest.fn(() => 1);
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 780, scale: 3, fontScale: mockFontScale() }),
}));
beforeEach(() => mockFontScale.mockReturnValue(1));

test('peer buttons share the row equally (flex 1 each), with the gap token, null children dropped', async () => {
  await render(row);
  await fireEvent(screen.getByTestId('row'), 'layout', layout(328));
  expect(flat('row')).toMatchObject({ flexDirection: 'row', gap: 8, alignSelf: 'stretch' });
  expect(cells()).toEqual([
    { flex: 1, minWidth: 0 },
    { flex: 1, minWidth: 0 },
  ]);
  expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel ?? null)).toHaveLength(2);
});

test('a narrow row stacks the buttons full width instead of clipping a label', async () => {
  await render(row);
  await fireEvent(screen.getByTestId('row'), 'layout', layout(200));
  expect(flat('row')).toMatchObject({ flexDirection: 'column' });
  expect(cells()).toEqual([{ alignSelf: 'stretch' }, { alignSelf: 'stretch' }]);
});

test('font scale 1.3 stacks a row that fits at 1.0', async () => {
  mockFontScale.mockReturnValue(1.3);
  await render(
    <ButtonRow testID="row">
      <Button variant="secondary" label="Reschedule" onPress={jest.fn()} />
      <Button variant="danger" label="Cancel lesson" onPress={jest.fn()} />
    </ButtonRow>,
  );
  await fireEvent(screen.getByTestId('row'), 'layout', layout(328));
  expect(flat('row').flexDirection).toBe('column');
});

test('nothing to show renders nothing', async () => {
  await render(<ButtonRow testID="row">{null}</ButtonRow>);
  expect(screen.queryByTestId('row')).toBeNull();
});
