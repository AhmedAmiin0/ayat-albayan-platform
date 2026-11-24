import { tzChoices, tzOptionLabel } from '@ab/shared';
import type { ComponentProps } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Select } from './select';

const CITY: Record<string, string | undefined> = t.tz;

/** City for a sentence, or undefined for a zone without a label. */
export const tzCity = (id: string): string | undefined => CITY[id];

export interface TimeZoneSelectProps extends Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'> {
  value: string;
  onValue: (tz: string) => void;
}

/** Rule 6: zones are picked, never typed; a stored zone outside the list stays selectable. */
export function TimeZoneSelect({ value, onValue, ...props }: TimeZoneSelectProps) {
  return (
    <Select {...props} value={value} onChange={(e) => onValue(e.target.value)}>
      {tzChoices(value).map((id) => (
        <option key={id} value={id}>
          {tzOptionLabel(id, CITY[id])}
        </option>
      ))}
    </Select>
  );
}
