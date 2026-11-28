import type { ChannelReplyView } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ChannelQuote } from './ChannelQuote';

const reply = (over: Partial<ChannelReplyView> = {}): ChannelReplyView => ({
  ...{ id: 'r1', sender_name: 'أم سلمى', sender_role: 'guardian', body: 'السلام عليكم' },
  ...{ kind: 'text', deleted: false },
  ...over,
});

test('shows who wrote the quoted message and its words', async () => {
  await render(<ChannelQuote reply={reply()} />);
  expect(screen.getByText('أم سلمى', { exact: false })).toBeTruthy();
  expect(screen.getByText('السلام عليكم', { exact: false })).toBeTruthy();
});

test('a deleted quote reads the deleted words', async () => {
  await render(<ChannelQuote reply={reply({ deleted: true })} />);
  expect(screen.getByText(t.studentChannel.reply.deleted, { exact: false })).toBeTruthy();
});
