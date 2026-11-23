import { counted } from '@ab/core';
import { useId } from 'react';
import { switchInputClass, SwitchTrack } from '@/components/settings/fields/SwitchTrack';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.shortLinks.form;

interface WhatsappSwitchProps {
  checked: boolean;
  onChange: (on: boolean) => void;
  /** The listed people and numbers it goes to. */
  listed: number;
}

/** «إرسال عبر واتساب»: the approved notifications template to everyone listed, once created. */
export function WhatsappSwitch({ checked, onChange, listed }: WhatsappSwitchProps) {
  const hintId = useId();
  const hint = listed > 0 ? counted(F.sendTo, listed) : F.sendWhatsappHint;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-rule pt-4">
      <div className="grid gap-1">
        <span className="text-sm font-semibold">{F.sendWhatsapp}</span>
        <p id={hintId} className="text-xs text-ink-3">{hint}</p>
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-label={F.sendWhatsapp}
          aria-describedby={hintId}
          aria-checked={checked}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={switchInputClass}
        />
        <SwitchTrack />
      </span>
    </div>
  );
}
