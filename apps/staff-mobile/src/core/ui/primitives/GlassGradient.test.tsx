import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { GlassGradient } from './GlassGradient';

const hidden = { includeHiddenElements: true };

// The sheen of the 4pt-padded tab capsule came out 8pt short and off-centre: a second capsule
// inside the first (owner's screenshot, 2026-10-26). Its Svg must size from a 0-inset fill.
test('the sheen fills a padded parent edge to edge, not its content box', async () => {
  await render(
    <View style={{ padding: 4 }}>
      <GlassGradient id="sheen" color="#ffffff" stops={[[0, 0.6], [1, 0.3]]} radius={31} />
    </View>,
  );
  const fill = screen.getByTestId('sheen-fill', hidden);
  expect(fill).toHaveStyle({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, pointerEvents: 'none' });
});

test('decorative: out of the accessibility tree', async () => {
  await render(<GlassGradient id="sheen" color="#ffffff" stops={[[0, 1]]} />);
  expect(screen.queryByTestId('sheen-fill')).toBeNull();
  expect(screen.getByTestId('sheen-fill', hidden)).toBeTruthy();
});
