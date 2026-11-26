import { isSelfChild, newReportCount, nextLesson } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { AppText, Avatar, Ltr, t, type, useNow, useTheme } from '@ab/mobile-kit';
import Svg, { Path } from 'react-native-svg';
import { whenText } from '@/lessons';
import { NewMark } from '@/ui';
import { useChildLessons, useChildReports, useFamilyClock, useSeenReports } from '@/portal';

/** ✓ beside the child in view (decorative: the row's name says it). */
function Check({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** On the child's own clock, once their lessons are known. */
function useNextLine(student: PortalStudent): string | undefined {
  const lessons = useChildLessons(student.id).data;
  const now = useNow();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const next = lessons ? nextLesson(lessons.lessons, now) : null;
  const when = next ? whenText(new Date(next.starts_at), clock, now) : null;
  return when ? t.portal.app.pick.next.replace('{when}', when) : undefined;
}

interface ChildSwitchRowProps {
  student: PortalStudent;
  kind: PortalKind;
  /** The child the app works as now. */
  current: boolean;
  onPress: () => void;
}

function RowWords({ name, code, next }: { name: string; code: string; next?: string }) {
  const { color } = useTheme();
  const small = { fontSize: type.size.xs, color: color.ink2 };
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {name}
      </AppText>
      <Ltr style={{ ...small, alignSelf: 'flex-start' }}>{code}</Ltr>
      {next ? <AppText style={small}>{next}</AppText> : null}
    </View>
  );
}

export function ChildSwitchRow({ student, kind, current, onPress }: ChildSwitchRowProps) {
  const { color } = useTheme();
  const reports = useChildReports(student.id).data?.reports ?? [];
  const fresh = newReportCount(reports, useSeenReports()) > 0;
  const name = isSelfChild(kind, student) ? t.portal.app.pick.me : student.name;
  const next = useNextLine(student);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: current || pressed ? color.lapisWash : undefined,
      })}
    >
      <Avatar name={student.name} id={student.id} decorative />
      <RowWords name={name} code={student.code} next={next} />
      {fresh ? <NewMark /> : null}
      {current ? <Check color={color.lapis} /> : null}
    </Pressable>
  );
}
