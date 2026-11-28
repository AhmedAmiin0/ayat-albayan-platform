import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { channelMessage } from '../../testing/channel-fixtures';
import { BubbleContent } from './BubbleContent';

test('a message shows its words', async () => {
  await render(<BubbleContent message={channelMessage({ body: 'جزاكم الله خيرا' })} />);
  expect(screen.getByText('جزاكم الله خيرا')).toBeTruthy();
});

test('a deleted message reads the deleted words', async () => {
  await render(<BubbleContent message={channelMessage({ body: 'x', deleted: true })} />);
  expect(screen.getByText(t.studentChannel.actions.deleted)).toBeTruthy();
  expect(screen.queryByText('x')).toBeNull();
});

test('a file with no caption shows no words', async () => {
  const view = await render(<BubbleContent message={channelMessage({ kind: 'photo' })} />);
  expect(view.toJSON()).toBeNull();
});
