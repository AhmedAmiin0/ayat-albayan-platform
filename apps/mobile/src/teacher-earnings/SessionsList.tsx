import type { TeacherEarningView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { EarningRow } from './EarningRow';
import { openIds } from './selection';

export interface SessionSelection {
  selected: readonly string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export interface SessionsListProps {
  sessions: TeacherEarningView[];
  empty: string;
  /** Admin only: tick boxes + «اختيار كل الحلقات المتبقية». Omitted = read-only. */
  selection?: SessionSelection;
}

function SelectAll({ sessions, selection }: { sessions: TeacherEarningView[]; selection: SessionSelection }) {
  const { color } = useTheme();
  const open = openIds(sessions);
  const all = open.length > 0 && open.every((id) => selection.selected.includes(id));
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={t.teacherEarnings.selectAll}
      accessibilityState={{ checked: all, disabled: open.length === 0 }}
      disabled={open.length === 0}
      onPress={selection.onToggleAll}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: color.sunk }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.lapis }}>
        {all ? '✓ ' : ''}
        {t.teacherEarnings.selectAll}
      </AppText>
    </Pressable>
  );
}

/** The per-session list, newest first. With `selection` each open session has a tick box. */
export function SessionsList({ sessions, empty, selection }: SessionsListProps) {
  const { color } = useTheme();
  if (sessions.length === 0) return <Note>{empty}</Note>;
  return (
    <View style={{ borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, overflow: 'hidden' }}>
      {selection ? <SelectAll sessions={sessions} selection={selection} /> : null}
      {sessions.map((s) => (
        <EarningRow
          key={s.id}
          earning={s}
          {...(selection
            ? { selected: selection.selected.includes(s.id), onToggle: () => selection.onToggle(s.id) }
            : {})}
        />
      ))}
    </View>
  );
}
