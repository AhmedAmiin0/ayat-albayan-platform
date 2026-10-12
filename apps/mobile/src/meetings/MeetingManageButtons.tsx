import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import type { Asking } from './use-meeting-manage';

const L = t.meetings.internal;
const M = t.meetingInvites.list;

export interface MeetingManageButtonsProps {
  /** A scheduled meeting: «غيّر الموعد» and «ألغِ الاجتماع» as well. */
  scheduled: boolean;
  onAsk: (asking: Asking) => void;
  onMove: () => void;
}

/** The creator's (or an admin's) buttons on an open meeting: reschedule, new link, end, cancel. */
export function MeetingManageButtons({ scheduled, onAsk, onMove }: MeetingManageButtonsProps) {
  return (
    <>
      {scheduled ? <Button variant="secondary" label={M.reschedule} onPress={onMove} /> : null}
      <Button variant="secondary" label={L.newLink} onPress={() => onAsk('link')} />
      <Button variant="ghost" label={L.end} onPress={() => onAsk('end')} />
      {scheduled ? <Button variant="ghost" label={M.cancel} onPress={() => onAsk('cancel')} /> : null}
    </>
  );
}
