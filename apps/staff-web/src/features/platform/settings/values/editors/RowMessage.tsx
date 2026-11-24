import type { SettingKey } from '@ab/settings';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useValues } from '@/features/platform/settings/values/values-context';
import type { RowIds } from './editor-props';

const v = t.settingsValues;

/** Always in the a11y tree: validation, a failed save with retry, or owned by a module page. */
export function RowMessage({ settingKey, ids }: { settingKey: SettingKey; ids: RowIds }) {
  const api = useValues();
  const error = api.error(settingKey);
  const status = api.status(settingKey);
  return (
    <div aria-live="polite" className="grid gap-1">
      {error && (
        <p id={ids.error} className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
      {status.state === 'failed' && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{v.saveError}</span>
          {status.message && <span className="text-ink-2">{status.message}</span>}
          <button type="button" className="min-h-11 font-semibold text-lapis underline underline-offset-4 sm:min-h-8" onClick={() => api.save(settingKey)}>
            {v.retry}
          </button>
        </p>
      )}
      {status.state === 'moved' && (
        <p className="flex items-center gap-1.5 text-xs text-ink-2">
          <NuqtaGlyph shape="hollow" />
          <span>{v.moved}</span>
        </p>
      )}
    </div>
  );
}
