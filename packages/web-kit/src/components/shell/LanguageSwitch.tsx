import type { Locale } from '@ab/shared';
import { useState } from 'react';
import { Icon } from '#/components/ui/display/index.ts';
import { Toast } from '#/components/ui/overlay/index.ts';
import { t, locale, chooseLocale } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

const other: Locale = locale === 'ar' ? 'en' : 'ar';

/**
 * «English» in the Arabic UI, «العربية» in the English one: the other language by its own name
 * (lang-tagged so a screen reader voices it right), after a visually hidden «اللغة» so the
 * accessible name holds the visible word (voice control). Signed in it writes the login's
 * language first (chooseLocale), then saves and reloads; a write that failed says so and stays.
 */
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
