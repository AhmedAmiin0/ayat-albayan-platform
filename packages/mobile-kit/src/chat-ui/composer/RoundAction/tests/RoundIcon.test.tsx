import { render } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';
import { RoundIcon } from '../RoundIcon';

const fade = { opacity: new Animated.Value(0.5), transform: [{ scale: new Animated.Value(1) }] };

test('the glyph sits inside the fade, so a mode change fades it', async () => {
  const { toJSON } = await render(<RoundIcon mode="mic" fade={fade} />);
  const tree = toJSON();
  const style = tree && !Array.isArray(tree) ? StyleSheet.flatten(tree.props.style) : {};
  expect(style).toMatchObject({ opacity: 0.5 });
});

test('mic and send draw different glyphs', async () => {
  const mic = await render(<RoundIcon mode="mic" fade={fade} />);
  const micTree = JSON.stringify(mic.toJSON());
  const send = await render(<RoundIcon mode="send" fade={fade} />);
  expect(JSON.stringify(send.toJSON())).not.toBe(micTree);
});
