import type { PortalStudent } from '@ab/shared';
import { dateText } from '@ab/time';
import { Pressable, View } from 'react-native';
import {
  AppText,
  Avatar,
  Chevron,
  Mark,
  StatusChip,
  t,
  type,
  useIsTestAccount,
  useNow,
  useTheme,
} from '@ab/mobile-kit';
import { FamilyBell } from './FamilyBell';
import { openChildSwitch } from './switch-store';
import { useFamilyClock, usePickedChild } from '@/portal';

interface GreetingHeaderProps {
  /** The big line: «أهلًا بك», or the student's name under it. */
  title: string;
  /** The small line over it: today's date, or «أهلًا بك» for a student. */
  over?: string;
  /** The home of the student in view shows their avatar instead of the academy's mark. */
  student?: PortalStudent;
}

interface WhoProps {
  title: string;
  over: string;
  student?: PortalStudent;
  /** A chevron after the name: the block is the child switch. */
  switches: boolean;
}

/** The avatar (or the mark), the small line over the big one. */
function Who({ title, over, student, switches }: WhoProps) {
  const { color } = useTheme();
  return (
    <>
      {student ? <Avatar name={student.name} id={student.id} decorative /> : <Mark size={44} />}
      <View style={{ flexShrink: 1 }}>
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{over}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: type.display,
              fontSize: type.size.h4,
              color: color.ink,
            }}
          >
            {title}
          </AppText>
          {switches ? <Chevron to="down" color={color.ink2} /> : null}
        </View>
      </View>
    </>
  );
}

const ROW = { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 } as const;

/**
 * Home's top (canvas Home, StudentHome): the mark, today's date over «أهلًا بك», the bell. For a
 * guardian of several children the child's avatar, name and a chevron are one button that opens
 * the children sheet (canvas SwitchHome). «تجريبي» marks a test account (docs/56), so nobody
 * mistakes it for a real family.
 */
export function GreetingHeader({ title, over, student }: GreetingHeaderProps) {
  const clock = useFamilyClock();
  const today = dateText(useNow(), clock, { weekday: 'long', day: 'numeric', month: 'long' });
  const picked = usePickedChild();
  const switches = student !== undefined && picked?.id === student.id;
  const who = <Who title={title} over={over ?? today} student={student} switches={switches} />;
  const isTest = useIsTestAccount();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      {switches ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.portal.app.pick.open.replace('{name}', title)}
          onPress={openChildSwitch}
          style={({ pressed }) => ({ ...ROW, minHeight: 48, opacity: pressed ? 0.7 : 1 })}
        >
          {who}
        </Pressable>
      ) : (
        <View style={ROW}>{who}</View>
      )}
      {isTest && <StatusChip tone="act" glyph="hollow" size="sm" label={t.testAccounts.chip} />}
      <FamilyBell />
    </View>
  );
}
