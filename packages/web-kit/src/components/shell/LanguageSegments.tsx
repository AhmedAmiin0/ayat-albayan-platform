import { LOCALES, type Locale } from '@ab/shared';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { useChooseLocale } from './use-choose-locale';

const OPTIONS = LOCALES.map((l) => ({ value: l, label: t.language[l], lang: l }));

/**
 * «اللغة» as segments («العربية | English», each by its own name and lang-tagged): the current
 * one pressed; the other writes the login's language and reloads like LanguageSwitch.
 */
export function LanguageSegments({ pill, className }: { pill?: boolean; className?: string }) {
  const { failed, choose, dismiss } = useChooseLocale();
  const pick = (next: Locale) => {
    if (next !== locale) choose(next);
  };
  return (
    <>
      <SegmentedControl
        label={t.language.label}
        options={OPTIONS}
        value={locale}
        onChange={pick}
        pill={pill}
        className={className}
      />
      {failed ? <Toast message={t.common.error} tone="error" onDismiss={dismiss} /> : null}
    </>
  );
}
