import { SwitchTrack, switchInputClass } from '@/components/settings/fields/SwitchTrack';
import { t } from '@/lib/i18n/i18n';

/** «مفعّل» / «مغلق» (the settings pages' state words). */
export const onOffWord = (on: boolean): string => (on ? t.settingsValues.on : t.settingsValues.off);

export interface RuleSwitchInputProps {
  checked: boolean;
  /** Named by its row («تشغيل «تذكير الحلقة»»), never only «مفعّل». */
  label: string;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

/** A checkbox with role=switch drawn as the settings track, with its state word; 44px hit area on phones. */
export function RuleSwitchInput({ checked, label, disabled, onChange }: RuleSwitchInputProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex min-h-11 items-center sm:min-h-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(e.target.checked)}
          className={switchInputClass}
        />
        <SwitchTrack />
      </span>
      <span aria-hidden="true" className="text-xs text-ink-2">
        {onOffWord(checked)}
      </span>
    </span>
  );
}
