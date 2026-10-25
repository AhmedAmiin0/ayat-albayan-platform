import { useState } from 'react';
import type { FieldControlProps } from '@/components/ui/form/field';
import { Icon } from '@/components/ui/display/icon';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';

type Props = FieldControlProps & {
  value: string;
  onValue: (value: string) => void;
  /** `new-password` for a new one (password managers offer to generate and save it). */
  autoComplete?: 'current-password' | 'new-password';
};

/**
 * Password with an eye at the inline-end (docs/design login, .pw): a toggle button named «إظهار»
 * (aria-pressed) that shows the typed text, which matters most on touch keyboards. The name must
 * not contain «كلمة السر»: e2e finds the input by that label. RTL like the reference, so the
 * button and the input's end padding sit on the same side.
 */
export function PasswordInput({ value, onValue, autoComplete = 'current-password', ...field }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        {...field}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        className="pe-12"
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <button
        type="button"
        aria-label={t.auth.showPassword}
        aria-pressed={shown}
        aria-controls={field.id}
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 end-1 my-auto grid size-9 cursor-pointer place-items-center rounded-sm text-ink-2 hover:bg-accent hover:text-lapis aria-pressed:text-lapis max-sm:size-11"
      >
        <Icon name={shown ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}
