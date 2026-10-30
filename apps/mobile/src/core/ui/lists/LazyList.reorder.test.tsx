import { render, screen } from '@testing-library/react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { LazyList } from './LazyList';

// A newest-first list (the chats) reorders without changing its length: a chat moves to the top.
// Rows that keep their objects keep their drawn cells in FlashList; each cell's rounded ends must
// still follow its new place in the card.

interface Row {
  id: string;
  name: string;
}
const row = (id: string, name: string): Row => ({ id, name });
const [a, b, c] = [row('r0', 'أ'), row('r1', 'ب'), row('r2', 'ج')];
const draw = ({ item }: { item: Row }) => <AppText>{item.name}</AppText>;
const keyOf = (r: Row) => r.id;

interface Ends {
  borderTopLeftRadius: number;
  borderBottomLeftRadius: number;
}

/** The rounded ends of the inset cell around a row's text. */
function ends(name: string) {
  let node = screen.getByText(name).parent;
  while (node && node.props.testID !== 'inset-cell') node = node.parent;
  const style = node?.props.style as Ends;
  return { top: style.borderTopLeftRadius > 0, bottom: style.borderBottomLeftRadius > 0 };
}

test('a row moved to the top or off it redraws its rounded ends (same count)', async () => {
  const list = (rows: Row[]) => <LazyList data={rows} keyExtractor={keyOf} renderItem={draw} />;
  const view = await render(list([a, b, c]));
  expect(ends('أ')).toEqual({ top: true, bottom: false });
  await view.rerender(list([c, a, b]));
  expect(ends('ج')).toEqual({ top: true, bottom: false });
  expect(ends('أ')).toEqual({ top: false, bottom: false });
  expect(ends('ب')).toEqual({ top: false, bottom: true });
});
