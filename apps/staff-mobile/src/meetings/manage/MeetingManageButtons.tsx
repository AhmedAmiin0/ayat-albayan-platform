import { t, Button } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import type { Asking } from './use-meeting-manage';

const L = t.meetings.internal;
const M = t.meetingInvites.list;

interface MeetingManageButtonsProps {
  /** A scheduled meeting gets reschedule and cancel instead of end, like the web MeetingRow. */
  scheduled: boolean;
  onAsk: (asking: Asking) => void;
  onMove: () => void;
}

/** docs/07 §6: one ButtonRow, danger actions last. */
export function MeetingManageButtons({ scheduled, onAsk, onMove }: MeetingManageButtonsProps) {
  return (
    <ButtonRow>
      {scheduled ? <Button variant="secondary" label={M.reschedule} onPress={onMove} /> : null}
      <Button variant="secondary" label={L.newLink} onPress={() => onAsk('link')} />
      {scheduled ? null : <Button variant="danger" label={L.end} onPress={() => onAsk('end')} />}
      {scheduled ? <Button variant="danger" label={M.cancel} onPress={() => onAsk('cancel')} /> : null}
    </ButtonRow>
  );
}
