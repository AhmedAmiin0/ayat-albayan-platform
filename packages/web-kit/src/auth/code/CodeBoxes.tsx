import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { keyStep, typeInto, type BoxesState } from './code-boxes';
import { useFirstBoxFocus } from './use-first-box-focus';

interface Props {
  digits: string[];
  onDigits: (digits: string[]) => void;
  invalid?: boolean;
}

/** One box; the family look (boards PortalWebSignInCode*): 52 px, rounded, bold Latin digits. */
const BOX = 'h-12 min-w-0 flex-1 px-0 text-center text-lg tabular-nums sm:h-12 ' +
  'family:h-[52px] family:sm:h-[52px] family:rounded-[14px] family:font-latin ' +
  'family:text-xl family:sm:text-xl family:font-bold family:aria-invalid:ring-0 ' +
  'family:focus:border-lapis family:focus:outline-none! ' +
  'family:focus:shadow-[0_0_0_4px_rgba(4,120,87,0.12)] ' +
  'family:aria-invalid:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]';

/**
 * The 6-digit code as one box per digit (docs/30 §7). The boxes read left to right in Arabic too
 * (dir="ltr"), the first one offers the SMS / WhatsApp autofill (`one-time-code`), and a whole code
 * pasted into any box fills them all.
 */
export function CodeBoxes({ digits, onDigits, invalid }: Props) {
  const labelId = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useFirstBoxFocus(refs);
  const apply = (next: BoxesState) => {
    onDigits(next.boxes);
    refs.current[next.focus]?.focus();
  };
  const onKeyDown = (at: number, e: KeyboardEvent<HTMLInputElement>) => {
    const next = keyStep(e.key, at, digits);
    if (!next) return;
    e.preventDefault();
    apply(next);
  };
  const onPaste = (at: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    apply(typeInto(digits, at, e.clipboardData.getData('text')));
  };

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
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t.familyAuth.codeDigit.replace('{n}', String(i + 1))}
            aria-invalid={invalid || undefined}
            value={digit}
            onChange={(e) => apply(typeInto(digits, i, e.target.value))}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className={BOX}
          />
        ))}
      </div>
    </div>
  );
}
