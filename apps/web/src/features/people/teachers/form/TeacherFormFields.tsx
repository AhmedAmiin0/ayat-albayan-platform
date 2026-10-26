import { GENDERS, PROGRAMS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { PhonePreview } from '@/components/ui/form/phone-preview';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { Teacher } from '../api';
import type { SetField, TeacherForm } from './teacher-form';
import { TeacherMeetingModeField } from './TeacherMeetingModeField';

type Props = { form: TeacherForm; set: SetField; teacher?: Teacher | null };

/**
 * Identity + contact fields of the teacher dialog (R-TCH-01). Phone and link are LTR islands;
 * then «طريقة حضور الحلقات».
 */
export function TeacherFormFields({ form, set, teacher = null }: Props) {
  const toggleProgram = (program: TeacherForm['programs'][number], on: boolean) =>
    set('programs', on ? [...form.programs, program] : form.programs.filter((p) => p !== program));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.teachers.displayNameAr}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            required
            value={form.display_name_ar}
            onChange={(e) => set('display_name_ar', e.target.value)}
          />
        )}
      </Field>
      <Field label={t.teachers.displayNameEn}>
        {(p) => (
          <Input {...p} dir="ltr" value={form.display_name_en} onChange={(e) => set('display_name_en', e.target.value)} />
        )}
      </Field>
      <Field label={t.teachers.gender}>
        {(p) => (
          <Select
            {...p}
            value={form.gender}
            onChange={(e) => set('gender', GENDERS.find((g) => g === e.target.value) ?? form.gender)}
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t.teachers.genderLabel[g]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <fieldset className="grid content-start gap-1.5">
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">{t.teachers.programs}</legend>
        <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
          {PROGRAMS.map((p) => (
            <label key={p} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.programs.includes(p)}
                onChange={(e) => toggleProgram(p, e.target.checked)}
              />
              {t.enums.program[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t.teachers.phone}>
        {(p) => (
          <>
            <Input
              {...p}
              type="tel"
              dir="ltr"
              autoComplete="off"
              value={form.phone_e164}
              onChange={(e) => set('phone_e164', e.target.value)}
            />
            <PhonePreview value={form.phone_e164} />
          </>
        )}
      </Field>
      <Field label={t.teachers.meetingLink}>
        {(p) => (
          <Input {...p} type="url" dir="ltr" value={form.meeting_link} onChange={(e) => set('meeting_link', e.target.value)} />
        )}
      </Field>
      <TeacherMeetingModeField form={form} set={set} teacher={teacher} />
    </div>
  );
}
