import { t } from '@/lib/i18n/i18n';

export interface StarterToggleProps {
  /** The template's shown name: each row's switch has its own accessible name. */
  name: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * «متاح للمعلمين والمبيعات» (the restricted allow-list) for one template (owner 2026-10-12, docs/16): a checkbox drawn as a
 * switch (still a checkbox to assistive tech and tests), like the settings switches.
 */
export function StarterToggle({ name, checked, disabled, onToggle }: StarterToggleProps) {
  return (
    <span className="relative inline-flex">
      <input
        type="checkbox"
        aria-label={t.templates.salesStarterFor.replace('{name}', name)}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-wait"
      />
      <span
        aria-hidden="true"
        className="block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150 peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lapis peer-disabled:opacity-60"
      />
      {/* The knob starts at the inline-start (right in RTL) and slides to the end when ON. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-[3px] top-[3px] size-[18px] rounded-full bg-ink-3 transition-transform duration-150 peer-checked:bg-white rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5"
      />
    </span>
  );
}
