import { RescheduleFrame, t } from '@ab/mobile-kit';
import { AskTimeBody } from './AskTimeBody';
import type { AskTimeSheetProps } from './AskTimeSheet.types';

/** The lesson keeps its time until the academy answers. */
export function AskTimeSheet(props: AskTimeSheetProps) {
  return (
    <RescheduleFrame open={props.open} onClose={props.onClose} title={t.portal.actions.request}>
      {props.open ? <AskTimeBody {...props} /> : null}
    </RescheduleFrame>
  );
}
