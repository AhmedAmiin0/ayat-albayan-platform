import { useState } from 'react';
import { View } from 'react-native';
import { ConflictNotice } from '@/booking/shared/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { familyTz } from '@/teaching/reschedule/reschedule-body';
import { Button } from '@/core/ui/primitives/Button';
import { canSubmit, editBody, lengthOf, type EditState } from '../lib/edit-time-body';
import { editTimeFailure } from '../lib/edit-time-errors';
import { lengthLocked, payoutLockOf, type PayoutLock } from '../lib/edit-time-lock';
import { EditTimeConfirm } from './EditTimeConfirm';
import { EditTimeDone } from './EditTimeDone';
import { EditTimeFields } from './EditTimeFields';
import { EditTimeHeader } from './EditTimeHeader';
import { PayoutLockNotice } from './PayoutLockNotice';
import { useEditTime } from '../lib/queries';
import { editMode, type EditableLesson } from '../lib/types';

export interface EditTimeFormProps {
  lesson: EditableLesson;
  onClose: () => void;
}

/**
 * «عدّل الوقت» (R-SCH-11): who and when now, the new length and start (a move: free slots; a
 * correction of a held lesson: same-day times), the reason, what it will change, then «احفظ
 * التعديل». A clash found by the API replaces the form with «اختار ميعاد تاني» (no save to press
 * again); a locked payout holds the length back until it is put back; an edit whose answer never
 * arrived says it is not sure it landed. Booking over a clash with a reason stays on the web.
 */
export function EditTimeForm({ lesson, onClose }: EditTimeFormProps) {
  const tz = familyTz(lesson);
  const mode = editMode(lesson);
  const edit = useEditTime(lesson.id);
  const [now] = useState(() => new Date());
  const [state, setState] = useState<EditState>({ picked: null, durationMin: lengthOf(lesson), reason: '', notify: true });
  // payout_locked outlives edit.reset(): it holds the length back however the form changes after it.
  const [lock, setLock] = useState<PayoutLock | null>(null);
  const failure = edit.isError ? editTimeFailure(edit.error) : null;
  const clash = failure?.kind === 'conflict' ? failure : null;
  const frozen = lengthLocked(lock, lesson, state);
  const change = (patch: Partial<EditState>) => {
    edit.reset();
    setState((s) => ({ ...s, ...patch }));
  };
  const body = editBody(lesson, state, now);
  const save = () => body && edit.mutate(body, { onError: (e) => setLock((l) => payoutLockOf(e) ?? l) });

  if (edit.data) return <EditTimeDone done={edit.data} tz={tz} onClose={onClose} />;
  if (mode === null) return <ErrorLine message={t.editTime.error.time_edit_not_allowed} />;
  return (
    <View style={{ gap: 16 }}>
      <EditTimeHeader lesson={lesson} mode={mode} tz={tz} />
      {clash ? (
        <ConflictNotice lines={clash.lines} onChangeSlot={() => change({ picked: null })} />
      ) : (
        <>
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
          <EditTimeConfirm
            lesson={lesson}
            mode={mode}
            state={state}
            now={now}
            payoutLocked={lock !== null}
            onNotify={(notify) => setState((s) => ({ ...s, notify }))}
          />
          {frozen && lock ? (
            <PayoutLockNotice
              lock={lock}
              original={lengthOf(lesson)}
              // A move's picked start was offered for the other length: it is asked again.
              onRestore={() => change({ durationMin: lengthOf(lesson), ...(mode === 'move' ? { picked: null } : {}) })}
            />
          ) : failure?.kind === 'error' ? (
            <ErrorLine message={failure.text} />
          ) : null}
          <Button
            label={edit.isPending ? t.common.saving : t.editTime.submit}
            onPress={save}
            busy={edit.isPending}
            disabled={!canSubmit(lesson, state, now) || frozen}
          />
        </>
      )}
    </View>
  );
}
