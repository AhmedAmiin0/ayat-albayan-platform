import type { Locale } from '@ab/shared';
import { useState } from 'react';
import { chooseLocale } from '@ab/web-kit/lib/i18n/profile-locale';

/**
 * «اللغة»'s act for the switch and the segments: writes the login's language (chooseLocale), then
 * saves and reloads; a write that failed sets `failed` (a toast says so) and the page stays.
 */
export function useChooseLocale() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const choose = (next: Locale) => {
    setBusy(true);
    void chooseLocale(next).then((ok) => {
      setBusy(false);
      setFailed(!ok);
    });
  };
  return { busy, failed, choose, dismiss: () => setFailed(false) };
}
