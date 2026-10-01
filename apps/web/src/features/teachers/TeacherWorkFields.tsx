import { TEACHER_STATUSES } from '@ab/shared';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { FormField, selectClass } from './FormField';
import { RATE_FIELDS, type SetField, type TeacherForm } from './teacher-form';

type Props = { form: TeacherForm; set: SetField };

const TIME_ZONES = Intl.supportedValuesOf('timeZone');

/** Time zone, status, capacity and per-duration rates (R-TCH-01, rule 6). */
export function TeacherWorkFields({ form, set }: Props) {
  const zones = TIME_ZONES.includes(form.tz) ? TIME_ZONES : [form.tz, ...TIME_ZONES];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="teacher-tz" label={t.teachers.tz}>
        <select
          id="teacher-tz"
          dir="ltr"
          className={selectClass}
          value={form.tz}
          onChange={(e) => set('tz', e.target.value)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="teacher-status" label={t.teachers.status}>
        <select
          id="teacher-status"
          className={selectClass}
          value={form.status}
          onChange={(e) =>
            set('status', TEACHER_STATUSES.find((s) => s === e.target.value) ?? form.status)
          }
        >
          {TEACHER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.enums.teacherStatus[s]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="teacher-max" label={t.teachers.maxStudents}>
        <Input
          id="teacher-max"
          type="number"
          min={1}
          step={1}
          value={form.max_students}
          onChange={(e) => set('max_students', e.target.value)}
        />
      </FormField>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">{t.teachers.rates}</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RATE_FIELDS.map(({ key, label }) => (
            <FormField key={key} id={`teacher-${key}`} label={label}>
              <Input
                id={`teacher-${key}`}
                type="number"
                min={0}
                step={1}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </FormField>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
