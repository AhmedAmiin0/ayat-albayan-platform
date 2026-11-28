import { t } from '@ab/web-kit';
import type { NoCommissionNoteProps } from './NoCommissionNote.types';
import { useNoCommissionNote } from './use-no-commission-note';

export function NoCommissionNote(props: NoCommissionNoteProps) {
  const started = useNoCommissionNote(props);
  if (!started) return null;
  return <p className="text-xs text-ink-3">{t.salesMoney.noCommissionStarted}</p>;
}
