import { DURATIONS, type Duration } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { bookingTeachersQuery } from '@/features/teaching/booking/api';
import { startInstant } from '@/features/teaching/classroom/api/meetings-api';
import { conflictText } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import { conflictsOf } from '@/features/teaching/schedule/api';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { DEFAULT_DURATION, draftProblem, instantBody, type InstantDraft } from './instant-form';
import { MeetingStudentPicker } from '../MeetingStudentPicker';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

interface Props {
  onClose: () => void;
  /** The lesson was created: go into its room. */
  onStarted: (lessonId: string) => void;
}

const durations: Record<string, string> = t.enums.duration;

/**
 * «حلقة فورية» (POST /lessons/instant): students, teacher and duration, then the lesson starts now
 * with its room open. A clash comes back 409 with the list; the admin may start anyway with a reason.
 */
export function InstantLessonDialog({ onClose, onStarted }: Props) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const [draft, setDraft] = useState<InstantDraft>({ students: [], teacherId: '', durationMin: DEFAULT_DURATION, reason: '' });
  const [requestId] = useState(() => crypto.randomUUID());
  const [tried, setTried] = useState(false);
  const program = draft.students[0]?.program;
  const teachers = useQuery({ ...bookingTeachersQuery({ program: program ?? 'quran', gender: null }), enabled: program !== undefined });
  const start = useMutation({ mutationFn: startInstant, onSuccess: (r) => onStarted(r.lessonId) });
  const conflicts = conflictsOf(start.error);
  const clashed = conflicts !== null;
  const problem = draftProblem(draft, clashed);
  const submit = () => {
    setTried(true);
    if (!problem) start.mutate(instantBody(draft, { clashed, requestId }));
  };
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
      <Button type="button" disabled={start.isPending} onClick={submit}>
        {start.isPending ? t.meetings.starting : t.meetings.start}
      </Button>
    </>
  );
  return (
    <Dialog title={t.meetings.dialogTitle} description={t.meetings.dialogHint} onClose={onClose} actions={actions}>
      <div className="grid gap-5">
        <MeetingStudentPicker picked={draft.students} onPicked={(students) => setDraft({ ...draft, students })} />
        {tried && problem === 'students' && <FormAlert>{t.meetings.noStudents}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.meetings.teacher} required {...(tried && problem === 'teacher' && { error: t.meetings.noTeacher })}>
            {(p) => (
              <Select {...p} value={draft.teacherId} disabled={!program} onChange={(e) => setDraft({ ...draft, teacherId: e.target.value })}>
                <option value="">{t.meetings.pickTeacher}</option>
                {(teachers.data ?? []).map((x) => (
                  <option key={x.id} value={x.id}>{teacherLabel(x)}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t.meetings.duration} required>
            {(p) => (
              <Select {...p} value={String(draft.durationMin)} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) as Duration })}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{durations[String(d)] ?? d}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {clashed && (
          <div className="grid gap-2">
            <FormAlert>{t.meetings.conflict}</FormAlert>
            <ul className="grid gap-1 text-sm text-ink-2">
              {conflicts.map((c) => (
                <li key={`${c.kind}-${c.startsAt}-${c.lessonId ?? ''}`}>{conflictText(c, clock)}</li>
              ))}
            </ul>
            <Field label={t.meetings.overrideReason} required {...(tried && problem === 'reason' && { error: t.common.required })}>
              {(p) => <Input {...p} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />}
            </Field>
          </div>
        )}
        {start.isError && !clashed && <FormAlert>{t.meetings.error}</FormAlert>}
      </div>
    </Dialog>
  );
}
