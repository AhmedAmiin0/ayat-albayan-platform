import { SETTING_DEFAULTS, type SettingKey } from '@ab/settings';
import { useState } from 'react';
import { ApiError, t } from '@ab/mobile-kit';
import { ascii } from '@/ops/shared/ascii-digits';
import {
  confirmOf,
  draftOf,
  parseDraft,
  sameValue,
  type Draft,
} from '@/ops/values/lib/value-draft';
import { useSaveValue } from './use-save-value';

/** closing means closing would drop the unsaved edit. */
type SheetStage = 'edit' | 'confirm' | 'closing';

interface ValueSheetOptions {
  valueKey: SettingKey;
  /** The value GET /settings holds now. */
  saved: unknown;
  /** Called after the server wrote the save. */
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
  const dirty = parsed.ok
    ? !sameValue(parsed.value, saved)
    : !sameValue(draft, draftOf(valueKey, saved));
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
            setNotice(t.mobileValues.owned);
            return;
          }
          if (outcome === 'invalid') {
            setStage('edit');
            setNotice(t.settings.invalid);
            return;
          }
          onSaved();
          onClose();
        },
        onError: (e) =>
          setNotice(
            e instanceof ApiError && e.status === 400
              ? t.settings.invalid
              : t.mobileValues.saveFailed,
          ),
      },
    );
  const submit = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (!dirty) {
      onClose();
      return;
    }
    if (confirm === null) {
      send(parsed.value);
      return;
    }
    setTypedState('');
    setStage('confirm');
  };
  const confirmSave = () => {
    if (!parsed.ok) return;
    if (confirm === 'typed' && ascii(typed) !== String(parsed.value)) {
      setError(t.mobileValues.typedMismatch);
      return;
    }
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
    /** Only puts the default into the draft; saving is separate. */
    resetDefault: () => setDraft(draftOf(valueKey, SETTING_DEFAULTS[valueKey])),
    submit,
    confirmSave,
    requestClose,
    keepEditing: () => setStage('edit'),
    close: onClose,
  };
}

export type ValueSheetState = ReturnType<typeof useValueSheet>;
