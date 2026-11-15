import type { CommsSource, ParityView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

const s = t.numbers.source;

export interface SourceButtonsProps {
  parity: ParityView;
  onPick: (next: CommsSource) => void;
}

/** To «الأرقام» (disabled while a difference remains, and says why) or back to the current setup (always). */
export function SourceButtons({ parity, onPick }: SourceButtonsProps) {
  if (parity.source === 'module') {
    return <Button size="sm" variant="secondary" onClick={() => onPick('legacy')}>{s.toLegacy}</Button>;
  }
  const blocked = parity.differences.length > 0;
  return (
    <>
      <Button size="sm" variant="secondary" disabled={blocked} onClick={() => onPick('module')}>{s.toModule}</Button>
      {blocked && <p className="basis-full text-xs text-ink-3">{s.blocked}</p>}
    </>
  );
}
