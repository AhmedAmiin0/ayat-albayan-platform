import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import type { SettingsFormState } from './registry-form/use-settings-form';

/** The one «حفظ» for every registry field, pinned under the sections (the switches save on their own). */
export function SaveBar({ state }: { state: SettingsFormState }) {
  return (
    <div className="sticky bottom-0 z-10 grid gap-2 border-t border-rule bg-page py-3">
      {state.failed && <FormAlert>{t.common.error}</FormAlert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">{t.settings.saveBar}</p>
        <Button type="button" disabled={state.saving} onClick={state.submit}>
          {state.saving ? t.common.saving : t.common.save}
        </Button>
      </div>
    </div>
  );
}
