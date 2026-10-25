import { formatPhone } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { useSettings } from '../use-settings';

/**
 * «الرقم المعلن للأسر» (docs/23 §2d): academy_whatsapp_e164 from GET /settings, LTR, read-only here
 * (it is edited in «القيم» ← الأكاديمية). Nothing until the settings arrive (the send state shows the error).
 */
export function PublicNumber() {
  const h = t.communicationsHub;
  const phone = useSettings().data?.academy_whatsapp_e164;
  if (phone === undefined) return null;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={h.publicNumber} trailing={<Note>{phone ? ltr(formatPhone(phone)) : h.publicNumberNone}</Note>} />
      </View>
      <Note>{h.publicNumberEdit}</Note>
    </View>
  );
}
