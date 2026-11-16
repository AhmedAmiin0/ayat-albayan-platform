import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { palette, shape } from '../../theme';
import { BubbleShell } from './BubbleShell';

const box = () => StyleSheet.flatten(screen.getByTestId('b').props.style);

test('ours: at the inline-end in the brand wash, the tail corner at the end', async () => {
  await render(
    <BubbleShell ours testID="b">
      <Text>hi</Text>
    </BubbleShell>,
  );
  expect(box()).toMatchObject({
    alignSelf: 'flex-end',
    borderTopEndRadius: shape.radius.xs,
    backgroundColor: palette.light.lapisWash,
  });
});

test('theirs: at the start, raised; a highlight edges it in the brand colour', async () => {
  await render(
    <BubbleShell ours={false} highlight testID="b">
      <Text>hi</Text>
    </BubbleShell>,
  );
  expect(box()).toMatchObject({
    alignSelf: 'flex-start',
    borderTopStartRadius: shape.radius.xs,
    backgroundColor: palette.light.raised,
    borderColor: palette.light.lapis,
  });
});

test('the caller style goes last; a long press makes it a press target', async () => {
  const onLongPress = jest.fn();
  const bare = { borderWidth: 0, backgroundColor: 'transparent' };
  await render(
    <BubbleShell ours style={bare} testID="b" onLongPress={onLongPress}>
      <Text>hi</Text>
    </BubbleShell>,
  );
  expect(box()).toMatchObject(bare);
  await fireEvent(screen.getByTestId('b'), 'longPress');
  expect(onLongPress).toHaveBeenCalled();
});
