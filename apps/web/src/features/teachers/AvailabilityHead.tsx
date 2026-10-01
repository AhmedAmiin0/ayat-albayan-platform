import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Ltr } from '@/components/ui/ltr';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';

const TIME_ZONES = Intl.supportedValuesOf('timeZone');
const [HINT_BEFORE = '', HINT_AFTER = ''] = t.availability.tzHint.split('{tz}');

type Props = { tz: string; onTz: (tz: string) => void };

/**
 * Panel title, the zone the grid is saved in (rule 6), and the note line saying so.
 * TODO(R-TCH-02): «بتوقيتها | بتوقيت الرياض» view switch and the DST warning (needs ar.json copy
 * for availability.dstNote and a zoned-time helper in @ab/shared).
 */
export function AvailabilityHead({ tz, onTz }: Props) {
  const id = useId();
  const zones = TIME_ZONES.includes(tz) ? TIME_ZONES : [tz, ...TIME_ZONES];
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <h2 className="font-display text-h3 font-bold">{t.availability.title}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <Label htmlFor={id}>{t.availability.tz}</Label>
          <Select id={id} dir="ltr" className="w-auto min-w-[210px]" value={tz} onChange={(e) => onTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="mb-4 flex items-start gap-2 rounded-md bg-sunk px-3.5 py-2.5 text-xs text-ink-2">
        <Icon name="globe" className="mt-0.5 size-4 text-ink-3" />
        <span>
          {HINT_BEFORE}
          <Ltr>{tz}</Ltr>
          {HINT_AFTER}
        </span>
      </p>
    </>
  );
}
