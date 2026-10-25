import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { SessionCard } from './SessionCard';
import { SESSION_GROUPS, type SessionGroup } from './sessions';

/** The three groups, each with its count; an empty group says why in one line. */
export function SessionGroupList({ groups }: { groups: Record<SessionGroup, LessonView[]> }) {
  const { color } = useTheme();
  return (
    <>
      {SESSION_GROUPS.map((group) => (
        <View key={group} style={{ gap: 8 }}>
          <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
            {`${t.classroom.admin.groups[group]} ${groups[group].length}`}
          </AppText>
          {groups[group].length === 0 ? <Note>{t.classroom.admin.groupEmpty[group]}</Note> : null}
          {groups[group].map((lesson) => (
            <SessionCard key={lesson.id} lesson={lesson} group={group} />
          ))}
        </View>
      ))}
    </>
  );
}
