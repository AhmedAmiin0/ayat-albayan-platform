import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { SlotButtonProps } from './SlotButton.types';
import { useSlotButton } from './use-slot-button';

export function SlotButton(props: SlotButtonProps) {
  const { busy, small, time, dir, className, pick } = useSlotButton(props);
  return (
    <button type="button" aria-pressed={props.picked} onClick={pick} className={className}>
      <span className="flex items-center gap-1">
        {busy && <NuqtaGlyph shape="struck" />}
        <span dir={dir}>{time}</span>
      </span>
      {small && <span className="text-2xs text-ink-3">{small}</span>}
      {busy && <span className="text-2xs text-ink-3">{t.booking.slotBusy}</span>}
    </button>
  );
}
