import type { ConfigEntry, SettingKey } from '@ab/shared';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useIsAdmin, usePermissions } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { canDescribe, checkDescription, counterText, describeError, descriptionOf } from './description-text';
import { useConfigEntry, useSaveDescription } from './use-config-entries';
import { hintOf } from './value-text';

export interface SheetDescription {
  entry: ConfigEntry | undefined;
  /** The full description the sheet shows (undefined: none). */
  text: string | undefined;
  /** «عدّل الوصف» is offered. */
  canEdit: boolean;
}

/** The sheet's description and whether this admin may edit it (docs/26 §2f, §3). */
export function useSheetDescription(key: SettingKey): SheetDescription {
  const entry = useConfigEntry(key);
  const can = usePermissions();
  const admin = useIsAdmin();
  return {
    entry,
    text: descriptionOf({ entry, hint: hintOf(key), locale }),
    canEdit: canDescribe({ entry, can, admin }),
  };
}

export interface DescriptionEditorOptions {
  valueKey: SettingKey;
  /** The text shown now: the editor starts from it. */
  initial: string;
  /** After a write the server took: the message to show («تم حفظ الوصف» / «أُعيد الوصف الأصلي»). */
  onDone: (message: string) => void;
}

/** The description editor: text, counter, check, save (trimmed) and restore (null). */
export function useDescriptionEditor({ valueKey, initial, onDone }: DescriptionEditorOptions) {
  const [text, setTextState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveDescription();
  const d = t.mobileValues.description;

  const send = (value: string | null, message: string) =>
    save.mutate(
      { key: valueKey, text: value },
      {
        onSuccess: () => {
          AccessibilityInfo.announceForAccessibility(message);
          onDone(message);
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  const submit = () => {
    const checked = checkDescription(text);
    if (!checked.ok) return setError(checked.error);
    send(checked.text, d.saved);
  };
  return {
    text,
    error,
    counter: counterText(text),
    saving: save.isPending,
    setText: (v: string) => {
      setTextState(v);
      setError(null);
    },
    submit,
    /** «أعد الوصف الأصلي»: null clears the admin's text and its override. */
    restore: () => send(null, d.restored),
  };
}

export type DescriptionEditorState = ReturnType<typeof useDescriptionEditor>;
