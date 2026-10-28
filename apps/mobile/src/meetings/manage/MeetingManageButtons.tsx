import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import type { Asking } from './use-meeting-manage';

const L = t.meetings.internal;
const M = t.meetingInvites.list;

interface MeetingManageButtonsProps {
  /** A scheduled meeting: «غيّر الموعد» and «ألغِ الاجتماع» instead of «إنهاء» (like web MeetingRow). */
  scheduled: boolean;
  onAsk: (asking: Asking) => void;
  onMove: () => void;
}

/**
 * The creator's (or an admin's) buttons on an open meeting, ONE ButtonRow (docs/07 §6): reschedule and
 * new link (secondary), then cancel (danger); «إنهاء» (danger) instead of reschedule/cancel for an instant one.
 */
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
