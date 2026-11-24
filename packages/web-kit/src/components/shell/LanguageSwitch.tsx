import type { Locale } from '@ab/shared';
import { useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { chooseLocale } from '@ab/web-kit/lib/i18n/profile-locale';
import { cn } from '@ab/web-kit/lib/utils';

const other: Locale = locale === 'ar' ? 'en' : 'ar';

/** The other language by its own name; signed in it writes the login's locale first. */
export function LanguageSwitch({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const choose = () => {
    setBusy(true);
    void chooseLocale(other).then((ok) => {
      setBusy(false);
      setFailed(!ok);
    });
  };
  return (
    <>
      <button
        type="button"
        onClick={choose}
        disabled={busy}
        className={cn(
          'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-2 transition-colors duration-(--duration-press) hover:bg-sunk hover:text-ink sm:min-h-[34px]',
          className,
        )}
      >
        <Icon name="globe" className="size-4" />
        <span className="sr-only">{t.language.label}</span>{' '}
        <span lang={other}>{t.language[other]}</span>
      </button>
      {failed ? <Toast message={t.common.error} tone="error" onDismiss={() => setFailed(false)} /> : null}
    </>
  );
}
