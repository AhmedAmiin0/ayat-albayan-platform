import type { BookingTeacherOption, ProfileCourseView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';

export interface TeacherDraft {
  teacherId: string;
  /** Keep the course's days and times (the remaining lessons move to the new teacher only). */
  keep: boolean;
  /** «يبدأ التغيير من» (local date in the course zone). */
  from: string;
}

export interface TeacherPickStepProps {
  view: ProfileCourseView;
  teachers: readonly BookingTeacherOption[];
  draft: TeacherDraft;
  onDraft: (patch: Partial<TeacherDraft>) => void;
  today: string;
  onNext: () => void;
}

type SelectProps = Pick<TeacherPickStepProps, 'draft' | 'onDraft'> & {
  others: readonly BookingTeacherOption[];
};

/** The new teacher: every other teacher of the student's program (no availability: disabled). */
function TeacherSelect({ others, draft, onDraft }: SelectProps) {
  return (
    <Field label={t.courseActions.teacher.pick}>
      {(p) => (
        <Select
          {...p}
          value={draft.teacherId}
          onChange={(e) => onDraft({ teacherId: e.target.value })}
        >
          <option value="">—</option>
          {others.map((x) => (
            <option key={x.id} value={x.id} disabled={!x.has_availability}>
              {x.display_name_ar}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

const keepOptions = () => [
  { value: 'keep' as const, label: t.courseActions.teacher.keepDays },
  { value: 'change' as const, label: t.courseActions.teacher.changeDays },
];

/** «تغيير المعلم», step 1: the current and the new teacher, keep or change the days, from when. */
export function TeacherPickStep(props: TeacherPickStepProps) {
  const { view, teachers, draft, onDraft, today, onNext } = props;
  const words = t.courseActions;
  const current = teachers.find((x) => x.id === view.course.teacherId)?.display_name_ar ?? '—';
  const others = teachers.filter((x) => x.id !== view.course.teacherId);
  const ready = draft.teacherId !== '' && draft.from !== '' && draft.from >= today;
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <span className="text-ink-3">{words.teacher.current}: </span>
        <span className="font-semibold">{current}</span>
      </p>
      {others.length === 0 && <p className="text-sm text-ink-3">{words.teacher.noTeachers}</p>}
      <TeacherSelect others={others} draft={draft} onDraft={onDraft} />
      <SegmentedControl
        label={words.teacher.title}
        options={keepOptions()}
        value={draft.keep ? 'keep' : 'change'}
        onChange={(v) => onDraft({ keep: v === 'keep' })}
      />
      <Field label={words.from} hint={words.fromHint}>
        {(p) => (
          <Input
            {...p}
            type="date"
            dir="ltr"
            min={today}
            value={draft.from}
            onChange={(e) => onDraft({ from: e.target.value })}
          />
        )}
      </Field>
      <div className="flex justify-end border-t border-rule pt-4">
        <Button type="button" disabled={!ready} onClick={onNext}>
          {t.booking.next}
        </Button>
      </div>
    </div>
  );
}
