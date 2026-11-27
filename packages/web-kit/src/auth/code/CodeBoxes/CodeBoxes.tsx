import { Input } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { CodeBoxesProps } from './CodeBoxes.types';
import { useCodeBoxes } from './use-code-boxes';

/**
 * The 6-digit code as one box per digit (docs/30 §7). The boxes read left to right in Arabic too
 * (dir="ltr"), the first one offers the SMS / WhatsApp autofill (`one-time-code`), and a whole code
 * pasted into any box fills them all.
 */
export function CodeBoxes(props: CodeBoxesProps) {
  const { digits, invalid, labelId, boxRef, onType, onKeyDown, onPaste } = useCodeBoxes(props);
  return (
    <div className="grid gap-1.5">
      <span id={labelId} className="text-sm font-medium text-ink">
        {t.familyAuth.code}
      </span>
      <div role="group" aria-labelledby={labelId} dir="ltr" className="flex justify-between gap-2">
        {digits.map((digit, i) => (
          <Input
            // The boxes are positional: their index is their identity.
            key={i}
            ref={boxRef(i)}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t.familyAuth.codeDigit.replace('{n}', String(i + 1))}
            aria-invalid={invalid || undefined}
            value={digit}
            onChange={(e) => onType(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 px-0 text-center text-lg tabular-nums sm:h-12"
          />
        ))}
      </div>
    </div>
  );
}
