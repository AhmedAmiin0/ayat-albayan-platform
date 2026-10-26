import { buttonVariants } from '@/components/ui/form/button';
import { Icon, type IconName } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { HUB_DESTINATIONS, HUB_PATHS, type HubDestination } from './hub-paths';
import { HubLink } from './HubLink';
import { HubStatus } from './HubStatus';

// The hub table (docs/26b §1, hub.html): القسم | الحالة الآن | فتح. The whole row is the link: the
// name is the row's one real <a>, stretched over the row; «افتح» only repeats it visually. Phones
// (< 640px) drop the description line and the «فتح» column.

const H = t.settingsHub;

const NAME: Record<HubDestination, string> = {
  values: t.settingsValues.title,
  communications: t.settingsPages.communications,
  integrations: t.integrations.title,
  google: H.googleName,
  appearance: t.settings.sections.appearance,
};

const ICON: Record<HubDestination, IconName> = {
  values: 'sliders',
  communications: 'bell',
  integrations: 'globe',
  google: 'calendar',
  appearance: 'grid',
};

const TH = 'border-b border-rule-strong px-2.5 py-1.5 text-start text-xs font-semibold text-ink-3';
const CELL = 'border-b border-rule px-2.5 py-2.5 text-start align-middle max-sm:px-1.5';

function HubRow({ destination }: { destination: HubDestination }) {
  return (
    <tr className="relative hover:bg-sunk has-[a:focus-visible]:bg-sunk">
      <th scope="row" className={cn(CELL, 'font-normal')}>
        <HubLink
          id={`hub-${destination}`}
          href={HUB_PATHS[destination]}
          className="inline-flex min-h-11 items-center gap-2 font-display text-lg font-bold text-ink no-underline after:absolute after:inset-0 after:content-[''] sm:min-h-8 sm:text-xl"
        >
          <Icon name={ICON[destination]} className="text-lapis" />
          <span>{NAME[destination]}</span>
        </HubLink>
        <span className="block max-w-[60ch] truncate text-[13px] text-ink-3 max-sm:hidden">{H.desc[destination]}</span>
      </th>
      <td className={CELL}>
        <HubStatus destination={destination} />
      </td>
      <td className={cn(CELL, 'w-24 max-sm:hidden')}>
        <span aria-hidden="true" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {H.open}
          <Icon name="chevron-left" />
        </span>
      </td>
    </tr>
  );
}

/** The five destinations, each with its live state. */
export function HubTable() {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{H.caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={TH}>
            {H.colSection}
          </th>
          <th scope="col" className={cn(TH, 'w-[38%] max-sm:w-[58%]')}>
            {H.colState}
          </th>
          <th scope="col" className={cn(TH, 'w-24 max-sm:hidden')}>
            <span className="sr-only">{H.colOpen}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {HUB_DESTINATIONS.map((d) => (
          <HubRow key={d} destination={d} />
        ))}
      </tbody>
    </table>
  );
}
