import { SETTINGS_SECTIONS, type SettingsSectionId } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** The sections of /admin/settings, in page order (the settings registry's). */
export { SETTINGS_SECTIONS };
export type SettingsSection = SettingsSectionId;

export const sectionId = (s: SettingsSection) => `settings-${s}`;

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The section index (owner, 2026-10-05): a column beside the settings from 900px, a row of chips
 * above them on phones. A link jumps to its section inside the page frame (smooth unless the
 * viewer asked for less motion) and is marked current.
 */
export function SettingsNav({ className }: { className?: string }) {
  const [current, setCurrent] = useState<SettingsSection>('messaging');
  return (
    <nav aria-label={t.settings.nav} className={className}>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 shell:mx-0 shell:flex-col shell:gap-0.5 shell:overflow-visible shell:p-0">
        {SETTINGS_SECTIONS.map((s) => (
          <li key={s} className="shrink-0">
            <a
              href={`#${sectionId(s)}`}
              aria-current={current === s ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault();
                setCurrent(s);
                document.getElementById(sectionId(s))?.scrollIntoView?.({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
              }}
              className={cn(
                'flex min-h-11 items-center whitespace-nowrap rounded-md border border-rule px-3 text-sm font-medium text-ink-2 no-underline transition-colors duration-150',
                'hover:bg-sunk hover:text-ink shell:min-h-9 shell:border-transparent shell:border-s-[3px]',
                'aria-[current=true]:bg-accent aria-[current=true]:font-semibold aria-[current=true]:text-ink shell:aria-[current=true]:border-s-lapis',
              )}
            >
              {t.settings.sections[s]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
