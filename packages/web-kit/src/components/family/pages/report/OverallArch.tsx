import { Icon } from '@ab/web-kit/components/ui/display/icon';

/**
 * «التقدير العام» on the hero (boards: the gold-outlined arch at the band's end): the overall
 * grade in gold on the dark green, read as a label and its value.
 */
export function OverallArch({ label, value }: { label: string; value: string }) {
  return (
    <dl className="relative grid h-[150px] w-[280px] shrink-0 content-center justify-items-center
      gap-1 rounded-t-[150px] rounded-b-[18px] border border-fam-gold/60 bg-white/5 px-6 pt-6
      text-center sm:w-[300px]">
      <dt className="grid justify-items-center gap-1 text-xs font-bold text-fam-hero-ink-2">
        <Icon name="star" className="size-5 text-fam-gold" />
        {label}
      </dt>
      <dd className="text-[34px] font-extrabold leading-tight text-fam-gold">{value}</dd>
    </dl>
  );
}
