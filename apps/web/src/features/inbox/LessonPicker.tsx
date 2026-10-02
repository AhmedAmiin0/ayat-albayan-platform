import { joinNames, lessonWhenText, type ThreadLesson } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';

const CITIES: Record<string, string | undefined> = t.tz;

export interface LessonPickerProps {
  lessons: readonly ThreadLesson[];
  value: string;
  onChange: (lessonId: string) => void;
  error?: string;
}

/**
 * The lesson a template is about (rule 6: its time is never typed): the guardian's / teacher's next
 * open lessons, shown in the recipient's tz as the message will say it.
 */
export function LessonPicker({ lessons, value, onChange, error }: LessonPickerProps) {
  const tz = lessons[0]?.tz;
  if (lessons.length === 0) return <p className="text-xs text-ink-3">{t.inbox.composer.noLessons}</p>;
  const hint = tz ? t.inbox.timesIn.replace('{city}', CITIES[tz] ?? tz) : undefined;
  return (
    <Field label={t.inbox.composer.pickLesson} hint={hint} error={error}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {`${lessonWhenText(new Date(l.starts_at), l.tz)} — ${joinNames(l.student_names)}`}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
