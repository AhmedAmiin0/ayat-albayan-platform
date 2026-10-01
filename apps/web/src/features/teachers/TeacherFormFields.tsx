import { GENDERS, PROGRAMS } from '@ab/shared';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { FormField, selectClass } from './FormField';
import type { SetField, TeacherForm } from './teacher-form';

type Props = { form: TeacherForm; set: SetField };

/** Identity + contact fields of the teacher dialog (R-TCH-01). */
export function TeacherFormFields({ form, set }: Props) {
  const toggleProgram = (program: TeacherForm['programs'][number], on: boolean) =>
    set('programs', on ? [...form.programs, program] : form.programs.filter((p) => p !== program));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="teacher-name-ar" label={t.teachers.displayNameAr}>
        <Input
          id="teacher-name-ar"
          required
          value={form.display_name_ar}
          onChange={(e) => set('display_name_ar', e.target.value)}
        />
      </FormField>
      <FormField id="teacher-name-en" label={t.teachers.displayNameEn}>
        <Input
          id="teacher-name-en"
          dir="ltr"
          value={form.display_name_en}
          onChange={(e) => set('display_name_en', e.target.value)}
        />
      </FormField>
      <FormField id="teacher-gender" label={t.teachers.gender}>
        <select
          id="teacher-gender"
          className={selectClass}
          value={form.gender}
          onChange={(e) => set('gender', GENDERS.find((g) => g === e.target.value) ?? form.gender)}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {t.teachers.genderLabel[g]}
            </option>
          ))}
        </select>
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t.teachers.programs}</legend>
        <div className="flex flex-wrap gap-4">
          {PROGRAMS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.programs.includes(p)}
                onChange={(e) => toggleProgram(p, e.target.checked)}
              />
              {t.enums.program[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField id="teacher-phone" label={t.teachers.phone}>
        <Input
          id="teacher-phone"
          type="tel"
          dir="ltr"
          autoComplete="off"
          value={form.phone_e164}
          onChange={(e) => set('phone_e164', e.target.value)}
        />
      </FormField>
      <FormField id="teacher-link" label={t.teachers.meetingLink}>
        <Input
          id="teacher-link"
          type="url"
          dir="ltr"
          value={form.meeting_link}
          onChange={(e) => set('meeting_link', e.target.value)}
        />
      </FormField>
    </div>
  );
}
