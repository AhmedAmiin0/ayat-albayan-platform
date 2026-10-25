import { TEACHER_STATUSES } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n';
import { RATE_FIELDS, type SetField, type TeacherForm } from './teacher-form';

type Props = { form: TeacherForm; set: SetField };

/** Time zone, status, capacity (one row of three) and per-duration rates (R-TCH-01, rule 6). */
export function TeacherWorkFields({ form, set }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={t.teachers.tz}>{(p) => <TimeZoneSelect {...p} value={form.tz} onValue={(tz) => set('tz', tz)} />}</Field>
      <Field label={t.teachers.status}>
        {(p) => (
          <Select
            {...p}
            value={form.status}
            onChange={(e) => set('status', TEACHER_STATUSES.find((s) => s === e.target.value) ?? form.status)}
          >
            {TEACHER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.enums.teacherStatus[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.teachers.maxStudents}>
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            step={1}
            className="tabular-nums"
            value={form.max_students}
            onChange={(e) => set('max_students', e.target.value)}
          />
        )}
      </Field>
      <fieldset className="sm:col-span-full">
        <legend className="mb-2 text-xs font-semibold text-ink-2">{t.teachers.rates}</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RATE_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={0}
                  step={1}
                  className="tabular-nums"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
