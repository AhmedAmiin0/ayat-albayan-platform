import { render, within } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { keyboardAt, laidOut } from '@ab/mobile-kit/testing';
import { ReplySheetFrame } from '@/inbox/saved-replies/quick-list/ReplySheetFrame';

// The saved-reply sheet, its fill form (FillReplyForm), the editor and the quote sheet sit in this
// Modal frame: a 400 × 800 window, its root at the window's top, the keyboard's top at 480.
const FILL = { testID: 'fill-reply-sheet', close: 'close' };
async function sheet(tall: boolean) {
  await render(
    <ReplySheetFrame onClose={() => undefined} tall={tall} name={tall ? FILL : undefined}>
      <Text>field</Text>
    </ReplySheetFrame>,
  );
  return laidOut(`${tall ? FILL.testID : 'saved-replies-sheet'}-keyboard`);
}

const os = Platform.OS;
afterEach(async () => {
  Platform.OS = os;
  await keyboardAt(null);
});

test.each(['ios', 'android'] as const)(
  '%s: the sheet and its field ride the keyboard',
  async (os) => {
    Platform.OS = os;
    const frame = await sheet(false);
    expect(within(frame).getByText('field')).toBeTruthy();
    await keyboardAt(480);
    expect(frame).toHaveStyle({ paddingBottom: 320 });
    await keyboardAt(null);
    expect(frame).toHaveStyle({ paddingBottom: 0 });
  },
);

test('a tall sheet (fill form, quote) shrinks to the room above the keyboard', async () => {
  Platform.OS = 'android';
  const frame = await sheet(true);
  expect(within(frame).getByTestId('fill-reply-sheet')).toHaveStyle({ maxHeight: '100%' });
  await keyboardAt(480);
  expect(frame).toHaveStyle({ paddingBottom: 320 });
});

test('no keyboard: the sheet sits on the window’s bottom', async () => {
  const frame = await sheet(false);
  expect(frame).toHaveStyle({ paddingBottom: 0, justifyContent: 'flex-end' });
});
