import { render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';
import { Chevron } from './Chevron';

const scaleOf = (id: string) => {
  const style = StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style);
  return (style.transform as { scaleX: number }[])[0]?.scaleX;
};

afterEach(() => {
  Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true });
});

test('RTL: «اللي فات» (prev) points right, towards the inline-start; «الجاي» points left', async () => {
  Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true });
  await render(
    <>
      <Chevron to="prev" color="#000" />
      <Chevron to="next" color="#000" />
    </>,
  );
  expect(scaleOf('chevron-prev')).toBe(-1); // the left-pointing path, mirrored
  expect(scaleOf('chevron-next')).toBe(1);
});

test('LTR: prev points left as drawn, next is mirrored', async () => {
  await render(
    <>
      <Chevron to="prev" color="#000" />
      <Chevron to="next" color="#000" />
    </>,
  );
  expect(scaleOf('chevron-prev')).toBe(1);
  expect(scaleOf('chevron-next')).toBe(-1);
});

test('down: a quarter turn back from the left-pointing path, the same in RTL', async () => {
  Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true });
  await render(<Chevron to="down" color="#000" />);
  const style = StyleSheet.flatten(screen.getByTestId('chevron-down', { includeHiddenElements: true }).props.style);
  expect(style.transform).toEqual([{ rotate: '-90deg' }]);
});
