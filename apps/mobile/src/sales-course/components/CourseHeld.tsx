import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/more';

/**
 * The picks are kept as a draft (owner 2026-11-06: the package is unpaid with an open payment
 * link): booked automatically once paid, editable until then (the wizard opens on them again).
 */
export function CourseHeld({ onDone }: { onDone: () => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Note>{t.courseDraft.saved}</Note>
      <Button label={t.salesMoney.done} onPress={onDone} />
    </View>
  );
}
