import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { LanguageSwitchProps } from './LanguageSwitch.types';
import { useLanguageSwitch } from './use-language-switch';

/** The other language by its own name; signed in it writes the login's locale first. */
export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { busy, failed, other, choose, dismiss } = useLanguageSwitch();
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
      {failed ? <Toast message={t.common.error} tone="error" onDismiss={dismiss} /> : null}
    </>
  );
}
