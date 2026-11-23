import { formatPhone } from '@ab/shared';
import { View } from 'react-native';
import { t, ListRow, ltr, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { useSettings } from '@/ops/settings/use-settings';

/** docs/23 §2d: read-only here; nothing renders until settings arrive. */
export function PublicNumber() {
  const h = t.communicationsHub;
  const phone = useSettings().data?.academy_whatsapp_e164;
  if (phone === undefined) return null;
  return (
    <View style={{ gap: 4 }}>
      <InsetGroup>
        <ListRow title={h.publicNumber} trailing={<Note>{phone ? ltr(formatPhone(phone)) : h.publicNumberNone}</Note>} />
      </InsetGroup>
      <Note>{h.publicNumberEdit}</Note>
    </View>
  );
}
