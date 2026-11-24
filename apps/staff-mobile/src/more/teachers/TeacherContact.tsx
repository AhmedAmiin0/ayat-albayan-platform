import { clickToChatLink, formatPhone } from '@ab/core';
import { teacherName } from '@ab/schedule';
import { Linking } from 'react-native';
import { t, type, useTheme, Button, Ltr, locale, Section } from '@ab/mobile-kit';
import type { Teacher } from '@ab/shared';

/** Renders nothing when no phone is on file. */
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
