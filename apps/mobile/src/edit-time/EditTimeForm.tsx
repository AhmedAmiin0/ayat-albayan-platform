import { useState } from 'react';
import { View } from 'react-native';
import { whenText } from '@/booking/slots';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { familyTz } from '@/reschedule/reschedule-body';
import { type, useTheme } from '@/theme';
import { studentNames } from '@/today/lesson-text';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { canSubmit, editBody, lengthOf, type EditState } from './edit-time-body';
import { editTimeFailure } from './edit-time-errors';
import { EditTimeConfirm } from './EditTimeConfirm';
import { EditTimeDone } from './EditTimeDone';
import { EditTimeFields } from './EditTimeFields';
import { useEditTime } from './queries';
import { editMode, type EditableLesson } from './types';

export interface EditTimeFormProps {
  lesson: EditableLesson;
  onClose: () => void;
}

/**
 * «عدّل الوقت» (R-SCH-11): who and when now, the new length and start (a move: free slots; a
 * correction of a held lesson: same-day times), the reason, what it will change, then «احفظ
 * التعديل». A clash found by the API comes back with «اختار ميعاد تاني»; an edit whose answer never
 * arrived says it is not sure it landed. Booking over a clash with a reason stays on the web.
 */
export function EditTimeForm({ lesson, onClose }: EditTimeFormProps) {
  const { color } = useTheme();
  const tz = familyTz(lesson);
  const mode = editMode(lesson);
  const edit = useEditTime(lesson.id);
  const [now] = useState(() => new Date());
  const [state, setState] = useState<EditState>({ picked: null, durationMin: lengthOf(lesson), reason: '', notify: true });
  const failure = edit.isError ? editTimeFailure(edit.error) : null;
  const change = (patch: Partial<EditState>) => {
    edit.reset();
    setState((s) => ({ ...s, ...patch }));
  };
  const body = editBody(lesson, state, now);
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };

  if (edit.data) return <EditTimeDone done={edit.data} tz={tz} onClose={onClose} />;
  if (mode === null) return <ErrorLine message={t.editTime.error.time_edit_not_allowed} />;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText style={{ ...text, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
          {studentNames(lesson)}
        </AppText>
        <AppText style={text}>{t.reschedule.current.replace('{when}', whenText(lesson.starts_at, tz))}</AppText>
      </View>
      {failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => change({ picked: null })} />
      ) : (
        <EditTimeFields
          lesson={lesson}
          mode={mode}
          state={state}
          tz={tz}
          now={now}
          onPick={(picked) => change({ picked })}
          // A start offered for the old length may not fit the new one.
          onDuration={(durationMin) => change({ durationMin, picked: null })}
          onReason={(reason) => change({ reason })}
        />
      )}
      <EditTimeConfirm lesson={lesson} mode={mode} state={state} now={now} onNotify={(notify) => setState((s) => ({ ...s, notify }))} />
      {failure?.kind === 'error' ? <ErrorLine message={failure.text} /> : null}
      <Button
        label={edit.isPending ? t.common.saving : t.editTime.submit}
        onPress={() => body && edit.mutate(body)}
        busy={edit.isPending}
        disabled={!canSubmit(lesson, state, now)}
      />
    </View>
  );
}
