import { SETTING_FIELD_OF, settingDef, type SettingKey } from '@ab/shared';
import { useId } from 'react';
import { controlClass, Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { shapeId, str, type SettingsForm } from '@/features/platform/settings/registry-form/settings-form';

export interface ShapeFieldsProps {
  settingKey: SettingKey;
  form: SettingsForm;
  onChange: (patch: SettingsForm) => void;
  /** The id of the one error line for the whole value, when there is one. */
  errorId?: string | undefined;
  disabled?: boolean;
}

/** The boxes of an object value (contact: site + email; consent notice: Arabic + English text). */
export function ShapeFields({ settingKey, form, onChange, errorId, disabled }: ShapeFieldsProps) {
  const id = useId();
  const def = settingDef(settingKey);
  if (def.type !== 'json') return null;
  const field = SETTING_FIELD_OF[settingKey];
  return (
    <div className="grid gap-3">
      {def.shape.map((f) => {
        const fid = shapeId(field, f.name);
        const common = {
          id: `${id}-${f.name}`,
          disabled,
          'aria-invalid': errorId ? (true as const) : undefined,
          'aria-describedby': errorId,
          value: str(form, fid),
          dir: f.kind === 'string' || f.name === 'en' ? ('ltr' as const) : ('rtl' as const),
          onChange: (e: { target: { value: string } }) => onChange({ [fid]: e.target.value }),
        };
        return (
          <div key={f.name} className="grid gap-1">
            <label htmlFor={common.id} className="text-xs font-semibold text-ink-2">
              {t.config.fields[f.name as keyof typeof t.config.fields]}
            </label>
            {f.kind === 'text' ? <textarea {...common} rows={3} className={cn(controlClass, 'py-2')} /> : <Input {...common} />}
          </div>
        );
      })}
    </div>
  );
}
