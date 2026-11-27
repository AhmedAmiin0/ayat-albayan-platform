import type { FamilyRequestView } from '@ab/schedule';
import { View } from 'react-native';
import { t, AppText, Note, RescheduleFrame, type, useTheme, whenText } from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { RequestAnswer } from './RequestAnswer';
import { requestAsked, requestMinutes } from './request-text';

interface RequestSheetProps {
  /** The request to answer; null = closed. */
  request: FamilyRequestView | null;
  onClose: () => void;
  /** The assistant's slot path; staff's by default. */
  slotsPath?: string;
}

export function RequestSheet({ request, onClose, slotsPath }: RequestSheetProps) {
  const title = request?.students.map((s) => s.name).join(t.common.listSeparator) ?? '';
  return (
    <RescheduleFrame open={request !== null} onClose={onClose} title={title}>
      {request ? (
        <RequestBody key={request.id} request={request} onClose={onClose} slotsPath={slotsPath} />
      ) : null}
    </RescheduleFrame>
  );
}

type BodyProps = RequestSheetProps & { request: FamilyRequestView };

function RequestBody({ request, onClose, slotsPath }: BodyProps) {
  const { color } = useTheme();
  const viewer = useViewerClock();
  const tz = request.students[0]?.tz ?? viewer.tz;
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, color: color.ink };
  const minutes = t.portal.app.lesson.minutes.replace('{n}', String(requestMinutes(request)));
  return (
    <View style={{ gap: 14 }}>
      <LessonStatusChip status={request.status} full />
      <AppText style={{ ...text, fontFamily: type.ui[600] }}>
        {requestAsked(request, viewer)}
      </AppText>
      {request.note ? (
        <Note>{t.lessons.proposal.familyNote.replace('{note}', request.note)}</Note>
      ) : null}
      <RequestAnswer request={request} onDone={onClose} slotsPath={slotsPath} />
      <View style={{ gap: 4 }}>
        <AppText style={{ ...text, fontFamily: type.ui[700] }}>{t.lessons.proposal.when}</AppText>
        <AppText style={text}>{whenText(request.starts_at, tz, viewer)}</AppText>
        <AppText style={{ ...text, color: color.ink2 }}>
          {`${request.teacher.display_name_ar} · ${minutes}`}
        </AppText>
      </View>
    </View>
  );
}
