import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/SegmentedControl';
import { THEME_OPTIONS } from './theme-options';
import type { ThemeToggleProps } from './ThemeToggle.types';
import { useThemeToggle } from './use-theme-toggle';

/** Saved per browser; automatic follows the OS. */
export function ThemeToggle({ size, className }: ThemeToggleProps) {
  const { pref, choose } = useThemeToggle();
  return (
    <SegmentedControl
      label={t.theme.label}
      options={THEME_OPTIONS}
      value={pref}
      onChange={choose}
      size={size}
      className={className}
    />
  );
}
