import type { Locale } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { cn } from '@ab/web-kit/lib/utils';
import { useChooseLocale } from './use-choose-locale';

const other: Locale = locale === 'ar' ? 'en' : 'ar';

/**
 * «English» in the Arabic UI, «العربية» in the English one: the other language by its own name
 * (lang-tagged so a screen reader voices it right), after a visually hidden «اللغة» so the
 * accessible name holds the visible word (voice control). Signed in it writes the login's
 * language first (chooseLocale), then saves and reloads; a write that failed says so and stays.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { busy, failed, choose, dismiss } = useChooseLocale();
  return (
    <>
      <button
        type="button"
        onClick={() => choose(other)}
        disabled={busy}
        className={cn(
          'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-2 transition-colors duration-[120ms] hover:bg-sunk hover:text-ink sm:min-h-[34px]',
          className,
        )}
      >
        <Icon name="globe" className="size-4" />
        <span className="sr-only">{t.language.label}</span>{' '}
        <span lang={other}>{t.language[other]}</span>
      </button>
      {failed ? <Toast message={t.common.error} tone="error" onDismiss={dismiss} /> : null}
    </>
  );
}
