import { formatPhone } from '@ab/shared';
import { Linking, View } from 'react-native';
import { t } from '@/lib/i18n';
import { whatsappLink } from '@/lib/phone';
import { shape, type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { SectionLabel } from './SectionLabel';
import type { StudentProfile } from './types';
import { AppText } from '@/core/ui/primitives/AppText';

/** ولي الأمر: name, LTR phone, «اتصال» (tel:) and «واتساب» (wa.me, the academy's channel). */
export function GuardianCard({ guardian }: { guardian: StudentProfile['guardian'] }) {
  const { color } = useTheme();
  const phone = guardian.phone_e164;
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <SectionLabel>{t.students.guardian}</SectionLabel>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
        }}
      >
        {guardian.name}
      </AppText>
      <Ltr
        style={{
          alignSelf: 'flex-start',
          fontFamily: type.ui[500],
          fontSize: type.size.body,
          color: color.ink2,
        }}
      >
        {formatPhone(phone)}
      </Ltr>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="ghost"
            label={t.mobile.call}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t.mobile.whatsapp} onPress={() => void Linking.openURL(whatsappLink(phone))} />
        </View>
      </View>
    </View>
  );
}
