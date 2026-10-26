import type { NotificationEntryView } from '@ab/shared';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { askOf, nameOf, needsTypedWord, ruleErrorText } from '../lib/rule-words';
import { useToggleRule } from './use-toggle-rule';

type Key = NotificationEntryView['key'];

/** The question open now: family ON (inline, under its row) or the typed «إيقاف» bottom sheet. */
export type OpenAsk = { key: Key; kind: 'family' | 'typed' } | null;

/** The line after a save, announced here once (no live region repeats it); also shown above the list. */
function announce(text: string) {
  try {
    AccessibilityInfo.announceForAccessibility(text);
  } catch {
    // never fail a save over an announcement
  }
}

/** The catalogue's switches: what each asks first, one PATCH per row, the errors per row, the saved line. */
export function useCatalogueToggles() {
  const toggle = useToggleRule();
  const [ask, setAsk] = useState<OpenAsk>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const setError = (key: Key, message: string | null) =>
    setErrors((all) => ({ ...all, [key]: message ?? undefined }));

  const send = (entry: NotificationEntryView, enabled: boolean, confirmText?: string) => {
    setError(entry.key, null);
    setSaved(null);
    toggle.mutate(
      { key: entry.key, enabled, confirmText },
      {
        onSuccess: () => {
          setAsk(null);
          const words = enabled ? t.mobileNotificationRules.savedOn : t.mobileNotificationRules.savedOff;
          const line = words.replace('{name}', nameOf(entry.key) ?? entry.key);
          setSaved(line);
          announce(line);
        },
        onError: (e) => {
          // The API knows the row is essential even when this build did not: ask for the word then.
          if (needsTypedWord(e) && confirmText === undefined) setAsk({ key: entry.key, kind: 'typed' });
          else if (ask?.kind !== 'typed' || ask.key !== entry.key) setAsk(null);
          setError(entry.key, needsTypedWord(e) && confirmText === undefined ? null : ruleErrorText(e));
        },
      },
    );
  };

  /** The switch moved: plain rows save now; family ON and essential OFF ask first. */
  const request = (entry: NotificationEntryView, next: boolean) => {
    const kind = askOf(entry, next);
    setError(entry.key, null);
    if (kind === 'plain') return send(entry, next);
    setAsk({ key: entry.key, kind });
  };

  return {
    ask,
    errors,
    saved,
    pendingKey: toggle.isPending ? (toggle.variables?.key ?? null) : null,
    request,
    send,
    /** «إلغاء» / close: the question and its error go; the switch never moved. */
    cancel: () => {
      if (ask) setError(ask.key, null);
      setAsk(null);
    },
  };
}

export type CatalogueToggles = ReturnType<typeof useCatalogueToggles>;
