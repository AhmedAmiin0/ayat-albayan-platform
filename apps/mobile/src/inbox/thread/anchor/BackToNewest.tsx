import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { leaveAnchor } from './use-anchor-param';

const PILL = { position: 'absolute', bottom: 12, start: 0, end: 0, alignItems: 'center' } as const;

/**
 * «الانتقال إلى أحدث رسالة» over the list's bottom while the chat shows the window around an old
 * hit (docs/37): back to the live chat, at its newest message.
 */
export function BackToNewest({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <View testID="back-to-newest" pointerEvents="box-none" style={PILL}>
      <Button variant="secondary" label={t.inbox.jumpLatest} onPress={leaveAnchor} />
    </View>
  );
}
