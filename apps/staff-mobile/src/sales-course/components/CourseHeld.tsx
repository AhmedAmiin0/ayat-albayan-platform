import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';

/**
 * The picks are kept as a draft (the package is unpaid with an open payment
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
