import { formatPhone, teacherName } from '@ab/shared';
import { Linking, View } from 'react-native';
import { t } from '@/lib/i18n';
import { whatsappLink } from '@/lib/phone';
import { type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { Section } from './Section';
import type { Teacher } from './types';
import { locale } from '@/lib/locale';

/** «رقم التواصل»: the LTR phone and a WhatsApp chat. Nothing at all when no phone is on file. */
export function TeacherContact({ teacher }: { teacher: Teacher }) {
  const { color } = useTheme();
  const phone = teacher.phone_e164;
  if (!phone) return null;
  return (
    <Section title={t.teachers.phone}>
      <Ltr
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.lg,
          lineHeight: type.lineHeight(type.size.lg),
          color: color.ink,
        }}
      >
        {formatPhone(phone)}
      </Ltr>
      <View style={{ alignItems: 'flex-start' }}>
        <Button
          variant="ghost"
          label={t.students.whatsappTo.replace('{name}', teacherName(teacher, locale))}
          onPress={() => void Linking.openURL(whatsappLink(phone))}
        />
      </View>
    </Section>
  );
}
