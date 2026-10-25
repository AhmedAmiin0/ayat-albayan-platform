import { SETTING_DEFAULTS, type SettingKey } from '@ab/shared';
import { useState } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ascii } from '../ascii-digits';
import { confirmOf, draftOf, parseDraft, sameValue, type Draft } from './value-draft';
import { useSaveValue } from './use-save-value';

/** edit: the editor; confirm: «احفظ» asked its question; closing: closing would drop the edit. */
export type SheetStage = 'edit' | 'confirm' | 'closing';

export interface ValueSheetOptions {
  valueKey: SettingKey;
  /** The value GET /settings holds now. */
  saved: unknown;
  /** Called after a save the server wrote (the screen announces «تم حفظ القيمة»). */
  onSaved: () => void;
  onClose: () => void;
}

/** The sheet's editor: draft, validation, the confirmations, one-key save, the close question. */
export function useValueSheet({ valueKey, saved, onSaved, onClose }: ValueSheetOptions) {
  const [draft, setDraftState] = useState<Draft>(() => draftOf(valueKey, saved));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<SheetStage>('edit');
  const [typed, setTypedState] = useState('');
  const save = useSaveValue();
  const parsed = parseDraft(valueKey, draft);
  const dirty = parsed.ok ? !sameValue(parsed.value, saved) : !sameValue(draft, draftOf(valueKey, saved));
  const confirm = parsed.ok ? confirmOf(valueKey, parsed.value, saved) : null;

  const setDraft = (patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
    setError(null);
    setNotice(null);
    setStage('edit');
  };
  const setTyped = (v: string) => {
    setTypedState(v);
    setError(null);
  };
  const send = (value: unknown) =>
    save.mutate(
      { key: valueKey, value },
      {
        onSuccess: ({ outcome }) => {
          if (outcome === 'moved') {
            setStage('edit');
            return setNotice(t.mobileValues.owned);
          }
          if (outcome === 'invalid') {
            setStage('edit');
            return setNotice(t.settings.invalid);
          }
          onSaved();
          onClose();
        },
        onError: (e) =>
          setNotice(e instanceof ApiError && e.status === 400 ? t.settings.invalid : t.mobileValues.saveFailed),
      },
    );
  const submit = () => {
    if (!parsed.ok) return setError(parsed.error);
    if (!dirty) return onClose();
    if (confirm === null) return send(parsed.value);
    setTypedState('');
    setStage('confirm');
  };
  const confirmSave = () => {
    if (!parsed.ok) return;
    if (confirm === 'typed' && ascii(typed) !== String(parsed.value)) return setError(t.mobileValues.typedMismatch);
    send(parsed.value);
  };
  const requestClose = () => (dirty && !save.isPending ? setStage('closing') : onClose());

  return {
    draft,
    error,
    notice,
    stage,
    confirm,
    typed,
    dirty,
    saving: save.isPending,
    setDraft,
    setTyped,
    /** «أعد القيمة الافتراضية»: the default goes into the draft; «احفظ» saves it. */
    resetDefault: () => setDraft(draftOf(valueKey, SETTING_DEFAULTS[valueKey])),
    submit,
    confirmSave,
    requestClose,
    keepEditing: () => setStage('edit'),
    close: onClose,
  };
}

export type ValueSheetState = ReturnType<typeof useValueSheet>;
