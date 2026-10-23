import { settingDef, type SettingKey } from '@ab/shared';
import { useId, useState } from 'react';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { rowUpdate, rowValue } from '../../registry-form/row-form';
import type { SettingsForm } from '../../registry-form/settings-form';
import { valueText } from '../value-format';
import { useValues } from '../values-context';
import type { EditorProps } from './editor-props';
import { ShapeFields } from './ShapeFields';

const v = t.settingsValues;

function ShapeDialog({ settingKey, onClose }: { settingKey: SettingKey; onClose: () => void }) {
  const api = useValues();
  const [form, setForm] = useState<SettingsForm>(() => api.drafts.form(settingKey));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const words = settingText(settingKey);
  const save = () => {
    const r = rowUpdate(settingKey, form);
    if (!r.ok) return setError(r.error);
    api.apply(settingKey, form);
    onClose();
  };
  return (
    <Dialog
      title={words.label}
      description={words.hint}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={save}>{v.shapeSave}</Button>
        </>
      }
    >
      <ShapeFields settingKey={settingKey} form={form} errorId={error ? errorId : undefined} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
      {error && (
        <p id={errorId} role="alert" className="mt-3 flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
    </Dialog>
  );
}

/** An object value in the table: a one-line summary and «عدّل الحقلين» (a dialog edits and saves it). */
export function ShapeEditor({ settingKey, ids }: EditorProps) {
  const api = useValues();
  const [open, setOpen] = useState(false);
  if (settingDef(settingKey).type !== 'json') return null;
  const summary = valueText(settingKey, rowValue(settingKey, api.drafts.form(settingKey)));
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="min-w-0 truncate text-sm" dir="auto">
        {summary}
      </span>
      <Button
        id={ids.editor}
        size="sm"
        variant="secondary"
        aria-haspopup="dialog"
        aria-label={`${v.shapeEdit}: ${settingText(settingKey).label}`}
        aria-describedby={ids.label}
        disabled={api.status(settingKey).state === 'saving'}
        onClick={() => setOpen(true)}
      >
        {v.shapeEdit}
      </Button>
      {open && <ShapeDialog settingKey={settingKey} onClose={() => setOpen(false)} />}
    </span>
  );
}
