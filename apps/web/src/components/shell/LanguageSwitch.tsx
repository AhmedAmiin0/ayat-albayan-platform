import type { Locale } from '@ab/shared';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { locale, setLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';

const other: Locale = locale === 'ar' ? 'en' : 'ar';

/**
 * «English» in the Arabic UI, «العربية» in the English one: the other language by its own name
 * (lang-tagged so a screen reader voices it right), after a visually hidden «اللغة» so the
 * accessible name holds the visible word (voice control). Saves the choice and reloads.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-2 transition-colors duration-[120ms] hover:bg-sunk hover:text-ink sm:min-h-[34px]',
        className,
      )}
    >
      <Icon name="globe" className="size-4" />
      <span className="sr-only">{t.language.label}</span>{' '}
      <span lang={other}>{t.language[other]}</span>
    </button>
  );
}
