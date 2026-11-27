import { Field } from '@ab/web-kit/components/ui/form/Field';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { CountryButton } from '@ab/web-kit/auth/phone/CountryButton';
import { CountryPicker } from '@ab/web-kit/auth/phone/CountryPicker';
import type { PhoneNumberFieldProps } from './PhoneNumberField.types';
import { usePhoneNumberField } from './use-phone-number-field';

/** One LTR field with the country at its start; shared by family sign-in and short links. */
export function PhoneNumberField(props: PhoneNumberFieldProps) {
  const { entry, hint, action, picking, setPicking, pick, label, enter, errorProp } =
    usePhoneNumberField(props);
  return (
    <>
      <Field label={label} hint={hint} {...errorProp}>
        {(p) => (
          <div className="flex gap-2">
            {/* The input takes the wrapper's LTR: digits start next to the calling code. */}
            <div dir="ltr" className="flex min-w-0 flex-1 gap-2">
              <CountryButton country={entry.country} onClick={() => setPicking(true)} />
              <Input
                {...p}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={entry.typed}
                onChange={(e) => entry.setTyped(e.target.value)}
                {...enter}
              />
            </div>
            {action}
          </div>
        )}
      </Field>
      {picking && (
        <CountryPicker current={entry.country} onPick={pick} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
