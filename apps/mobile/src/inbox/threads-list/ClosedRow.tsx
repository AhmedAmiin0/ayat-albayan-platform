import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ClosedNote } from '../thread/components/ClosedNote';
import { SavedRepliesButton } from '../saved-replies/SavedRepliesButton';

/**
 * The row once the 24 h window closed: why (ClosedNote), «الردود السريعة» dimmed with its reason
 * (staff only) and «أرسل قالبًا».
 */
export function ClosedRow({ known, staff, onTemplate }: { known: boolean; staff: boolean; onTemplate: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ClosedNote known={known} />
      {staff ? <SavedRepliesButton open={false} onPress={() => undefined} /> : null}
      <Button label={t.inbox.composer.sendTemplate} onPress={onTemplate} />
    </View>
  );
}
