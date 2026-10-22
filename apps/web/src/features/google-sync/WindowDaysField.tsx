import { GOOGLE_WINDOW_DAYS } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { fill } from './google-format';
import { parseWindowDays } from './google-input';
import type { useSaveSettings } from './use-save-settings';

const s = t.googleSync.switches;
const { min, max } = GOOGLE_WINDOW_DAYS;

interface Props {
  value: number;
  save: ReturnType<typeof useSaveSettings>;
}

/** «نطاق التقويم بالأيام» with its own «حفظ»; an out-of-range number is flagged and nothing is sent. */
export function WindowDaysField({ value, save }: Props) {
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    const n = parseWindowDays(text);
    setInvalid(n === null);
    if (n !== null && n !== value) save.mutate({ window_days: n });
  };
  return (
    <div className="max-w-sm">
      <Field label={s.window} hint={s.windowHint} {...(invalid ? { error: fill(t.googleSync.web.windowInvalid, { min, max }) } : {})}>
        {(p) => (
          <div className="flex gap-2">
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={min}
              max={max}
              step={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="max-w-28"
            />
            <Button variant="secondary" disabled={save.isPending} onClick={submit}>
              {t.googleSync.web.save}
            </Button>
          </div>
        )}
      </Field>
    </div>
  );
}
