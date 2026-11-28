import { dateText, nextDstTransition } from '@ab/time';
import { useId, useMemo } from 'react';
import { Icon, Label, Ltr, TimeZoneSelect, tzCity, t, locale } from '@ab/web-kit';

interface Props {
  tz: string;
  onTz: (tz: string) => void;
}

/** An ar.json sentence with its `{tz}` / `{city}` slot filled by the city, or the LTR id. */
function ZoneText({ template, tz }: { template: string; tz: string }) {
  const [before = '', after = ''] = template.split(/\{(?:tz|city)\}/);
  return (
    <>
      {before}
      {tzCity(tz) ?? <Ltr>{tz}</Ltr>}
      {after}
    </>
  );
}

/** Shown when the zone shifts within 30 days (docs/07 §8). */
function dstTemplate(tz: string): string | null {
  const shift = nextDstTransition(tz, new Date());
  if (!shift) return null;
  const weekday = dateText(shift.day, { tz, locale }, { weekday: 'long' });
  const date = `${weekday} ${dateText(shift.day, { tz, locale }, { day: 'numeric', month: 'long' })}`;
  return (shift.dir === 'back' ? t.availability.dstBack : t.availability.dstForward).replace(
    '{date}',
    date,
  );
}

/** The grid is saved in the teacher's zone (rule 6). */
export function AvailabilityHead({ tz, onTz }: Props) {
  const id = useId();
  const dst = useMemo(() => dstTemplate(tz), [tz]);
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <h2 className="font-display text-h3 font-bold">{t.availability.title}</h2>
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <Label htmlFor={id}>{t.availability.tz}</Label>
          <TimeZoneSelect
            id={id}
            className="w-full sm:w-auto sm:min-w-[210px] sm:max-w-[280px]"
            value={tz}
            onValue={onTz}
          />
        </div>
      </div>
      <p className="mb-4 flex items-start gap-2 rounded-md bg-sunk px-3.5 py-2.5 text-xs text-ink-2">
        <Icon name="globe" className="mt-0.5 size-4 text-ink-3" />
        <span>
          <span className="block">
            <ZoneText template={t.availability.tzHint} tz={tz} />
          </span>
          {dst && (
            <span className="block font-semibold text-ink" data-dst="">
              <ZoneText template={dst} tz={tz} />
            </span>
          )}
        </span>
      </p>
    </>
  );
}
