import { DURATIONS, lessonStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { RequiredMark } from '@/components/ui/form/label';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { cn } from '@/lib/utils';
import { makeupCandidatesQuery } from './api.invoice';
import type { MakeupCandidate } from './contract';
import type { BookingDraft } from './draft';
import { pickedText } from './SlotStep';

export interface MissedLessonStepProps {
  draft: Pick<BookingDraft, 'students' | 'missed' | 'tz' | 'teacher'>;
  /** From the lesson drawer's «حجز تعويضي»: picked once the candidates load. */
  preselectId?: string | undefined;
  onChange: (patch: Partial<Pick<BookingDraft, 'missed' | 'durationMin' | 'teacher' | 'startsAt'>>) => void;
}

/** The patch a pick makes: the missed lesson, its length, and no teacher or slot of the old pick. */
function pickPatch(c: MakeupCandidate, current: BookingDraft['teacher']) {
  const durationMin = DURATIONS.find((d) => d === c.duration_min);
  return {
    missed: { lessonId: c.lesson_id, startsAt: c.starts_at, teacherId: c.teacher.id, durationMin: durationMin ?? 45 },
    ...(durationMin ? { durationMin } : {}),
    ...(current && current.id !== c.teacher.id ? { teacher: null } : {}),
    startsAt: null,
  };
}

/**
 * «اختار الحلقة اللي الطالب فاتته» (R-SCH-10): the student's missed, chargeable lessons of the last
 * 60 days that have no makeup yet. The pick fixes the length and preselects the teacher (editable).
 */
export function MissedLessonStep({ draft, preselectId, onChange }: MissedLessonStepProps) {
  const studentId = draft.students[0]?.id ?? '';
  const list = useQuery({ ...makeupCandidatesQuery(studentId), enabled: studentId !== '' });
  const done = useRef(false);
  const { teacher, missed } = draft;
  useEffect(() => {
    if (done.current || !preselectId || missed || !list.data) return;
    done.current = true;
    const match = list.data.find((c) => c.lesson_id === preselectId);
    if (match) onChange(pickPatch(match, teacher));
  }, [preselectId, missed, teacher, list.data, onChange]);

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">
        {t.booking.makeup.pickMissed}
        <RequiredMark />
      </legend>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {list.data?.length === 0 && <p className="text-sm text-ink-2">{preselectId ? t.booking.makeup.noneForLesson : t.booking.makeup.none}</p>}
      {preselectId && !missed && list.data && list.data.length > 0 && !list.data.some((c) => c.lesson_id === preselectId) && (
        <p className="text-sm text-ink-2">{t.booking.makeup.noneForLesson}</p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.data?.map((c) => (
          <li key={c.lesson_id}>
            <label
              className={cn(
                'flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2.5',
                missed?.lessonId === c.lesson_id ? 'border-lapis bg-accent' : 'border-rule hover:bg-sunk',
              )}
            >
              <input
                type="radio"
                name="booking-missed"
                checked={missed?.lessonId === c.lesson_id}
                onChange={() => onChange(pickPatch(c, teacher))}
                className="size-4 accent-[var(--lapis)]"
              />
              <span className="min-w-0 flex-1 text-sm font-semibold">{pickedText(c.starts_at, draft.tz)}</span>
              <StatusChip {...lessonStatusStyle[c.status]} label={t.enums.lessonStatus[c.status]} size="sm" />
              <span className="basis-full ps-7 text-xs text-ink-3">{teacherLabel(c.teacher)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
