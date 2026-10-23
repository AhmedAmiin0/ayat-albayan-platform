import { isEditableValueKey, VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { useEffect, useState } from 'react';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { defaultForm, isModified } from '../registry-form/row-form';
import { lastChangeText } from './cells/InfoCells';
import { useRowIds } from './editors/editor-props';
import { ValueEditor } from './editors/ValueEditor';
import { boundsText, defaultText, valueText } from './value-format';
import { useValues } from './values-context';

const v = t.settingsValues;

function DiscardDialog({ onDiscard, onKeep }: { onDiscard: () => void; onKeep: () => void }) {
  return (
    <Dialog
      compact
      title={v.sheet.discardTitle}
      description={v.sheet.discardBody}
      onClose={onKeep}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onKeep}>
            {v.sheet.keep}
          </Button>
          <Button variant="danger-quiet" onClick={onDiscard}>
            {v.sheet.discard}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}

/**
 * The phone editor (docs/26b §2 «Phone»): a sheet titled by the label with the full description,
 * the editor (16px, 44px), bounds, default + reset, last change, the impact note, «إلغاء» + «احفظ»
 * and a closed «للمطوّر» with the key. Closing with an unsaved edit asks first. Read-only: no editor.
 */
export function ValueSheet({ settingKey, onClose }: { settingKey: SettingKey; onClose: () => void }) {
  const api = useValues();
  const ids = useRowIds();
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState(false);
  const words = settingText(settingKey);
  const editable = api.canWrite && isEditableValueKey(settingKey);
  const dirty = api.drafts.dirty(settingKey);
  const status = api.status(settingKey).state;
  const bounds = boundsText(settingKey);
  const confirm = VALUE_CONFIRM[settingKey];
  useEffect(() => {
    if (sent && status === 'idle' && !dirty) onClose();
  }, [sent, status, dirty, onClose]);
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
          setSent(true);
          api.save(settingKey);
        }}
      >
        {status === 'saving' ? v.saving : v.sheet.save}
      </Button>
    </>
  ) : undefined;
  return (
    <Dialog title={words.label} description={words.toggleHint ?? words.hint} onClose={close} actions={actions}>
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
        <p className="text-sm text-ink-2">{v.sheet.last.replace('{value}', lastChangeText(api.meta[settingKey]))}</p>
        {confirm && <p className="text-xs text-ink-3">{confirm === 'typed' ? v.tags.deletes : v.tags.confirm}</p>}
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
