import { render } from '@testing-library/react-native';
import { QuoteGlyph } from './QuoteGlyph';

test.each(['photo', 'pdf', 'voice'] as const)('a quoted %s shows its icon', async (kind) => {
  const view = await render(<QuoteGlyph kind={kind} deleted={false} />);
  expect(view.toJSON()).not.toBeNull();
});

test('a text, or a deleted file, shows no icon', async () => {
  const text = await render(<QuoteGlyph kind="text" deleted={false} />);
  expect(text.toJSON()).toBeNull();
  const gone = await render(<QuoteGlyph kind="photo" deleted />);
  expect(gone.toJSON()).toBeNull();
});
