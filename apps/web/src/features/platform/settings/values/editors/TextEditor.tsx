import { normalizePhone, SETTING_FIELD_OF, settingDef } from '@ab/shared';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { str } from '@/features/platform/settings/registry-form/settings-form';
import { boundsText } from '@/features/platform/settings/values/lib/value-format';
import { useValues } from '@/features/platform/settings/values/values-context';
import { denseClass, describedBy, type EditorProps } from './editor-props';

/** Free text, or an E.164 phone (`type=tel`, LTR) with the form it will be saved in (rule 7). */
export function TextEditor({ settingKey, ids, sheet }: EditorProps) {
  const api = useValues();
  const def = settingDef(settingKey);
  const field = SETTING_FIELD_OF[settingKey];
  const value = str(api.drafts.form(settingKey), field);
  const error = api.error(settingKey);
  const phone = def.type === 'e164';
  const normal = phone ? normalizePhone(value) : null;
  const previewId = `${ids.editor}-preview`;
  const preview = normal?.ok && normal.e164 !== value ? normal.e164 : null;
  return (
    <span className="grid gap-1">
      <Input
        id={ids.editor}
        type={phone ? 'tel' : 'text'}
        dir={phone ? 'ltr' : undefined}
        inputMode={phone ? 'tel' : undefined}
        aria-labelledby={ids.label}
        aria-describedby={describedBy(boundsText(settingKey) && ids.bounds, preview !== null && previewId, error && ids.error)}
        aria-invalid={error ? true : undefined}
        disabled={api.status(settingKey).state === 'saving'}
        value={value}
        onChange={(e) => api.drafts.edit(settingKey, { [field]: e.target.value })}
        className={denseClass(sheet, 'w-[220px]')}
      />
      {preview && (
        <small id={previewId} className="text-2xs text-ink-3">
          {t.settingsValues.phonePreview.split('{phone}')[0]}
          <bdi dir="ltr">{preview}</bdi>
        </small>
      )}
    </span>
  );
}
