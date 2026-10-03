import { FILLED_BY, GROUP_KINDS } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { controlClass, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { QualFieldsProps } from './QualificationFields';
import type { QualTextField } from './qualification-form';

// The first registration form's questions that had no field (research-forms 9), with its wording
// and options, in its order: after «الدولة» the family block, at the end «نوع الحلقة» + notes.

const choice = <T extends string>(list: readonly T[], value: string): T | '' => list.find((x) => x === value) ?? '';

function TextField({ name, label, ...props }: QualFieldsProps & { name: QualTextField; label: string }) {
  const ltr = name === 'alt_phone';
  return (
    <Field label={label} error={props.errors[name]}>
      {(p) => (
        <Input
          {...p}
          type={ltr ? 'tel' : 'text'}
          dir={ltr ? 'ltr' : undefined}
          value={props.form[name]}
          onChange={(e) => props.onChange({ [name]: e.target.value })}
        />
      )}
    </Field>
  );
}

/** «المدينة», «بتملا الاستمارة بصفتك», «اسم ولي الأمر», «صلة القرابة بالطالب», «رقم تواصل بديل». */
export function FamilyFields(props: QualFieldsProps) {
  const { form, onChange } = props;
  return (
    <>
      <div className="@[26rem]:col-span-2">
        <TextField {...props} name="city" label={t.leads.city} />
      </div>
      <div className="@[26rem]:col-span-2">
        <Field label={t.leads.filledBy}>
          {(p) => (
            <Select {...p} value={form.filled_by} onChange={(e) => onChange({ filled_by: choice(FILLED_BY, e.target.value) })}>
              <option value="">—</option>
              {FILLED_BY.map((v) => (
                <option key={v} value={v}>
                  {t.leads.filledByOption[v]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <TextField {...props} name="guardian_name" label={t.guardians.name} />
      <TextField {...props} name="guardian_relation" label={t.leads.guardianRelation} />
      <div className="@[26rem]:col-span-2">
        <TextField {...props} name="alt_phone" label={t.leads.altPhone} />
      </div>
    </>
  );
}

/** «نوع الحلقة» (فردي · جماعي) and «ملاحظات أو طلبات خاصة», last as on the form. */
export function RequestFields({ form, errors, onChange }: QualFieldsProps) {
  return (
    <div className="grid gap-3">
      <Field label={t.leads.groupKind}>
        {(p) => (
          <Select {...p} value={form.group_kind} onChange={(e) => onChange({ group_kind: choice(GROUP_KINDS, e.target.value) })}>
            <option value="">—</option>
            {GROUP_KINDS.map((v) => (
              <option key={v} value={v}>
                {t.leads.groupKindOption[v]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.leads.notes} error={errors.notes}>
        {(p) => (
          <textarea
            {...p}
            rows={2}
            maxLength={2000}
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className={cn(controlClass, 'field-sizing-content min-h-20 py-2 leading-relaxed')}
          />
        )}
      </Field>
    </div>
  );
}
