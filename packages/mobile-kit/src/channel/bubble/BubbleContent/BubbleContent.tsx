import type { ChannelMessageView } from '@ab/shared';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui/primitives/AppText';
import { useSmallText } from '../../../chat-ui/bubble/use-small-text';
import { BubbleText } from '../BubbleText';

export function BubbleContent({ message: m }: { message: ChannelMessageView }) {
  const small = useSmallText('ink3');
  if (m.deleted) {
    return (
      <AppText style={{ ...small, fontStyle: 'italic' }}>
        {t.studentChannel.actions.deleted}
      </AppText>
    );
  }
  return m.body ? <BubbleText body={m.body} /> : null;
}
