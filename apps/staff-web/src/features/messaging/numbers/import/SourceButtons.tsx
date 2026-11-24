import type { ParityView } from '@ab/shared';
import type { CommsSource } from '@ab/settings';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const s = t.numbers.source;

export interface SourceButtonsProps {
  parity: ParityView;
  onPick: (next: CommsSource) => void;
}

/** Switching to the numbers source is disabled while a parity difference remains. */
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
