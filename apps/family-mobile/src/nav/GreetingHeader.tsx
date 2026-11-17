import { dateText, type PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import {
  AppText,
  Avatar,
  Mark,
  StatusChip,
  t,
  type,
  useIsTestAccount,
  useNow,
  useTheme,
} from '@ab/mobile-kit';
import { FamilyBell } from './FamilyBell';
import { useFamilyClock } from '@/portal';

interface GreetingHeaderProps {
  /** The big line: «أهلًا بك», or the student's name under it. */
  title: string;
  /** The small line over it: today's date, or «أهلًا بك» for a student. */
  over?: string;
  /** The home of the student in view shows their avatar instead of the academy's mark. */
  student?: PortalStudent;
}

/**
 * Home's top (canvas Home, StudentHome): the mark, today's date over «أهلًا بك», the bell, and
 * «تجريبي» for a test account (docs/56), so nobody mistakes it for a real family.
 */
export function GreetingHeader({ title, over, student }: GreetingHeaderProps) {
  const { color } = useTheme();
  const clock = useFamilyClock();
  const today = dateText(useNow(), clock, { weekday: 'long', day: 'numeric', month: 'long' });
  const isTest = useIsTestAccount();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      {student ? <Avatar name={student.name} id={student.id} decorative /> : <Mark size={44} />}
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{over ?? today}</AppText>
        <AppText
          accessibilityRole="header"
          style={{ fontFamily: type.display, fontSize: type.size.h4, color: color.ink }}
        >
          {title}
        </AppText>
      </View>
      {isTest && <StatusChip tone="act" glyph="hollow" size="sm" label={t.testAccounts.chip} />}
      <FamilyBell />
    </View>
  );
}
