import type { Locale } from '@ab/core';
import { useState } from 'react';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { chooseLocale } from '@ab/web-kit/lib/i18n/profile-locale';

export function useLanguageSwitch() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const choose = () => {
    setBusy(true);
    void chooseLocale(other).then((ok) => {
      setBusy(false);
      setFailed(!ok);
    });
  };
  const dismiss = () => setFailed(false);
  return { busy, failed, other, choose, dismiss };
}
