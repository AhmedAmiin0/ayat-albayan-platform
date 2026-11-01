import { isEditableValueKey, VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { useEffect, useState } from 'react';
import { DiscardDialog } from '@/components/settings/dialogs/DiscardDialog';
import { settingText } from '@/components/settings/search/setting-text';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { defaultForm, isModified } from '@/features/platform/settings/registry-form/row-form';
import { lastChangeText } from '@/features/platform/settings/values/cells/InfoCells';
import { useRowIds } from '@/features/platform/settings/values/editors/editor-props';
import { ValueEditor } from '@/features/platform/settings/values/editors/ValueEditor';
import { ConflictNotice } from '@/features/platform/settings/values/conflicts/ConflictNotice';
import { ImpactNote } from './ImpactNote';
import { useSheetDescription } from '@/features/platform/settings/values/description/use-sheet-description';
import { boundsText, defaultText, valueText } from '@/features/platform/settings/values/lib/value-format';
import { useValues } from '@/features/platform/settings/values/values-context';
import { useClock } from '@/lib/clock';

const v = t.settingsValues;

const DISCARD_WORDS = { title: v.sheet.discardTitle, body: v.sheet.discardBody, discard: v.sheet.discard, keep: v.sheet.keep };

/**
 * The phone editor (docs/26b §2 «Phone»): a sheet titled by the label with the full description,
 * the editor (16px, 44px), bounds, default + reset, last change, the impact note, «إلغاء» + «احفظ»
 * and a closed «للمطوّر» with the key. Closing with an unsaved edit asks first. Read-only: no editor.
 */
export function ValueSheet({ settingKey, onClose }: { settingKey: SettingKey; onClose: () => void }) {
  const api = useValues();
  const clock = useClock();
  const ids = useRowIds();
  const [asking, setAsking] = useState(false);
  const words = settingText(settingKey);
  const status = api.status(settingKey).state;
  const editable = api.canWrite && isEditableValueKey(settingKey) && status !== 'moved';
  const dirty = api.drafts.dirty(settingKey);
  const bounds = boundsText(settingKey);
  const confirm = VALUE_CONFIRM[settingKey];
  const description = useSheetDescription(settingKey, Boolean(confirm));
  // Closes only when a save of this key lands: never after a refused, cancelled or failed «احفظ».
  const savedAt = api.savedAt(settingKey);
  const [openedAt] = useState(savedAt);
  useEffect(() => {
    if (savedAt !== openedAt) onClose();
  }, [savedAt, openedAt, onClose]);
  const close = () => (editable && dirty ? setAsking(true) : onClose());
  const actions = editable ? (
    <>
      <Button variant="ghost" onClick={close}>
        {t.common.cancel}
      </Button>
      <Button
        disabled={status === 'saving'}
        onClick={() => {
          if (!dirty) return onClose();
          api.save(settingKey);
        }}
      >
        {status === 'saving' ? v.saving : v.sheet.save}
      </Button>
    </>
  ) : undefined;
  return (
    <Dialog layout="sheet" title={words.label} description={description} onClose={close} actions={actions}>
      <span id={ids.label} className="sr-only">
        {words.label}
      </span>
      <div className="grid gap-3">
        {editable ? <ValueEditor settingKey={settingKey} ids={ids} sheet /> : <p className="text-base">{valueText(settingKey, api.settings[settingKey])}</p>}
        {bounds && (
          <small id={ids.bounds} className="text-xs text-ink-3">
            {bounds}
          </small>
        )}
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
          {v.sheet.default.replace('{value}', defaultText(settingKey))}
          {editable && isModified(settingKey, api.settings) && (
            <Button size="sm" variant="ghost" onClick={() => api.drafts.put(settingKey, defaultForm(settingKey))}>
              {v.resetDefault}
            </Button>
          )}
        </p>
        <p className="text-sm text-ink-2">{v.sheet.last.replace('{value}', lastChangeText(api.meta[settingKey], clock))}</p>
        {confirm && <ImpactNote settingKey={settingKey} />}
        <ConflictNotice settingKey={settingKey} />
        {status === 'moved' && <p className="text-sm text-ink-2">{v.moved}</p>}
        {status === 'saving' && <span role="status" className="text-sm font-semibold text-ink-2">{v.saving}</span>}
        <details className="text-xs text-ink-3">
          <summary className="min-h-11 cursor-pointer content-center">{v.sheet.dev}</summary>
          <bdi dir="ltr" className="font-mono">
            {settingKey}
          </bdi>
        </details>
      </div>
      {asking && (
        <DiscardDialog
          words={DISCARD_WORDS}
          onKeep={() => setAsking(false)}
          onDiscard={() => {
            api.drafts.discard(settingKey);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}
