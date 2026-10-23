import { SETTING_FIELD_OF, settingDef, type SettingKey } from '@ab/shared';
import { useId } from 'react';
import { settingText } from '@/components/settings/setting-text';
import type { RowExtras } from '@/components/settings/SettingRow';
import { controlClass, Input } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { str, shapeId } from '../messaging/settings-form';
import type { SettingsFormState } from '../messaging/use-settings-form';

/** An object setting (contact, consent notice): one labelled box per field, one error for the whole setting. */
export function ShapeRow({ settingKey, state, extras }: { settingKey: SettingKey; state: SettingsFormState; extras: RowExtras }) {
  const id = useId();
  const def = settingDef(settingKey);
  const field = SETTING_FIELD_OF[settingKey];
  const words = settingText(settingKey);
  const error = state.errors[field];
  if (def.type !== 'json') return null;
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="grid gap-3 border-b border-rule py-4 last:border-b-0">
      <legend className="float-start mb-1 text-sm font-semibold text-ink">{words.label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {words.hint && <p className="text-xs text-ink-3">{words.hint}</p>}
        <span className="flex items-center gap-2">{extras.actions}</span>
      </div>
      {extras.extra}
      <div className="grid gap-3 sm:grid-cols-2">
        {def.shape.map((f) => {
          const fid = shapeId(field, f.name);
          const label = t.config.fields[f.name as keyof typeof t.config.fields];
          const common = {
            id: `${id}-${f.name}`,
            'aria-invalid': error ? (true as const) : undefined,
            value: str(state.form, fid),
            dir: f.kind === 'string' || f.name === 'en' ? ('ltr' as const) : ('rtl' as const),
            onChange: (e: { target: { value: string } }) => state.set({ [fid]: e.target.value }),
          };
          return (
            <div key={f.name} className={cn('grid gap-1', f.kind === 'text' && 'sm:col-span-2')}>
              <label htmlFor={common.id} className="text-xs text-ink-2">
                {label}
              </label>
              {f.kind === 'text' ? <textarea {...common} rows={3} className={cn(controlClass, 'py-2')} /> : <Input {...common} />}
            </div>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
