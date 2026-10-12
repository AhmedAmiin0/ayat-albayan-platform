import { useState } from 'react';
import type { FieldControlProps } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

type Props = FieldControlProps & {
  value: string;
  onValue: (value: string) => void;
  /** `new-password` for a new one (password managers offer to generate and save it). */
  autoComplete?: 'current-password' | 'new-password';
};

/**
 * Password with «إظهار» at the inline-end (docs/design login, .pw): a toggle button
 * (aria-pressed) that shows the typed text, which matters most on touch keyboards. RTL like the
 * reference, so the button and the input's end padding sit on the same side.
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
        className="pe-[72px]"
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-controls={field.id}
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 end-1 my-auto h-9 cursor-pointer rounded-sm px-2 text-xs font-semibold text-lapis hover:bg-accent aria-pressed:bg-accent max-sm:h-11"
      >
        {t.auth.showPassword}
      </button>
    </div>
  );
}
