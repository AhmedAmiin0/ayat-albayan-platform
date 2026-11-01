import { clickToChatLink, formatPhone, teacherName } from '@ab/shared';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { Section } from '@/core/ui/surface/Section';
import type { Teacher } from '@/core/lib/staff/types';
import { locale } from '@/core/lib/i18n/locale';

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
      <Button
        variant="secondary"
        label={t.students.whatsappTo.replace('{name}', teacherName(teacher, locale))}
        onPress={() => void Linking.openURL(clickToChatLink(phone))}
      />
    </Section>
  );
}
