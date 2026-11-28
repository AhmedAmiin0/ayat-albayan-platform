import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui/primitives/AppText';
import { BubbleText } from '../BubbleText';
import type { BubbleContentProps } from './BubbleContent.types';
import { useBubbleContent } from './use-bubble-content';

export function BubbleContent({ message: m }: BubbleContentProps) {
  const { small } = useBubbleContent();
  if (m.deleted) {
    return (
      <AppText style={{ ...small, fontStyle: 'italic' }}>
        {t.studentChannel.actions.deleted}
      </AppText>
    );
  }
  return m.body ? <BubbleText body={m.body} /> : null;
}
