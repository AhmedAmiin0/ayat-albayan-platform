import { Linking, Pressable, Text, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { Ltr } from '@/ui/Ltr';
import { profileFacts } from './profile-facts';
import { SectionLabel } from './SectionLabel';
import type { StudentProfile } from './types';

/** Program, level…, tz, teacher, then the effective meeting link, which opens in the browser/app. */
export function StudentFacts({ student }: { student: StudentProfile }) {
  const { color } = useTheme();
  const value = { fontFamily: type.ui[500], fontSize: type.size.body, color: color.ink };
  const link = student.meeting_link;
  return (
    <View style={{ gap: 12 }}>
      {profileFacts(student).map((fact) => (
        <View key={fact.label}>
          <SectionLabel>{fact.label}</SectionLabel>
          {fact.ltr ? (
            <Ltr style={[value, { alignSelf: 'flex-start' }]}>{fact.value}</Ltr>
          ) : (
            <Text style={[value, { lineHeight: type.lineHeight(type.size.body) }]}>{fact.value}</Text>
          )}
        </View>
      ))}
      {link ? (
        <View>
          <SectionLabel>{t.students.meetingLink}</SectionLabel>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t.students.meetingLink}
            onPress={() => void Linking.openURL(link)}
            style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
          >
            <Ltr
              style={[
                value,
                { alignSelf: 'flex-start', color: color.lapis, textDecorationLine: 'underline' },
              ]}
            >
              {link.replace(/^https?:\/\//, '')}
            </Ltr>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
