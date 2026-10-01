import { tzChoices, tzOptionLabel } from '@ab/shared';
import type { ComponentProps } from 'react';
import { t } from '@/lib/i18n';
import { Select } from './select';

const CITY: Record<string, string | undefined> = t.tz;

/** City for a sentence («المواعيد بتوقيت القاهرة»), or undefined for a zone without a label. */
export const tzCity = (id: string): string | undefined => CITY[id];

export interface TimeZoneSelectProps extends Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'> {
  value: string;
  onValue: (tz: string) => void;
}

/**
 * Every person's zone (rule 6): the curated list as «القاهرة (Africa/Cairo)», picked, never typed.
 * A stored zone outside the list stays selectable, so editing never silently changes it.
 */
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
