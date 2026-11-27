import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { CodesGateProps } from './CodesGate.types';
import { useCodesGate } from './use-codes-gate';

/** Shows `children` only while that side's WhatsApp codes can be sent, `fallback` otherwise. */
export function CodesGate({ side = 'family', fallback, children }: CodesGateProps) {
  const { open } = useCodesGate(side);
  if (open === undefined) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  return <>{open ? children : fallback}</>;
}
