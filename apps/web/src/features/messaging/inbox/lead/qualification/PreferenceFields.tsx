import { tzChoices, tzOptionLabel } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { timeOptions, WEEK_ORDER } from '@/features/people/teachers/availability/grid';
import { t } from '@/lib/i18n/i18n';
import type { QualFieldsProps } from './QualificationFields';

const weekday: Record<string, string> = t.enums.weekday;

/**
 * When the student can study (R-LEAD-03): days, «وقت البدء» as a range picked from the same
 * 30-minute selects as availability (times are never typed, rule 6), then the zone — the first
 * registration form's order (research-forms 8).
 */
export function PreferenceFields({ form, errors, onChange }: QualFieldsProps) {
  const toggle = (day: number) =>
    onChange({
      available_days: form.available_days.includes(day)
        ? form.available_days.filter((d) => d !== day)
        : [...form.available_days, day].sort((a, b) => a - b),
    });
  const time = (key: 'preferred_from' | 'preferred_to', label: string) => (
    <Field label={label} error={errors[key]}>
      {(p) => (
        <Select {...p} className="tabular-nums" value={form[key]} onChange={(e) => onChange({ [key]: e.target.value })}>
          <option value="">—</option>
          {timeOptions(form[key]).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  return (
    <div className="grid gap-3">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.leads.availableDays}</legend>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1">
          {WEEK_ORDER.map((day) => (
            <label key={day} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
              <input
                type="checkbox"
                checked={form.available_days.includes(day)}
                onChange={() => toggle(day)}
                className="size-4 accent-[var(--lapis)]"
              />
              <span>{weekday[String(day)]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.leads.preferredTime}</legend>
        <div className="grid grid-cols-2 gap-3">
          {time('preferred_from', t.availability.from)}
          {time('preferred_to', t.availability.to)}
        </div>
      </fieldset>
      <Field label={t.leads.tz} error={errors.tz}>
        {(p) => (
          <Select {...p} value={form.tz} onChange={(e) => onChange({ tz: e.target.value })}>
            <option value="">—</option>
            {tzChoices(form.tz).map((id) => (
              <option key={id} value={id}>
                {tzOptionLabel(id, tzCity(id))}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
