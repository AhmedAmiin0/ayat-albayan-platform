import { counted, courseLessonCount, type BookingRequest, type BookingResult, type SalesCourseView } from '@ab/shared';
import { View } from 'react-native';
import { whenText } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { type, useTheme } from '@/theme';
import { courseEnd } from '@/sales-course/lib/course-body';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseDoneProps {
  result: BookingResult;
  body: BookingRequest;
  view: SalesCourseView;
  onDone: () => void;
  /** On to the package's transfer, when the wizard came from «احفظ الاشتراك». */
  transfer?: (() => void) | undefined;
}

/** After POST /sales/booking 201: the first lesson the API made, when the course ends, the way on. */
export function CourseDone({ result, body, view, onDone, transfer }: CourseDoneProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const [first] = result.lessons.map((l) => l.starts_at).sort();
  const total = view.subscription ? courseLessonCount(view.subscription) : 0;
  const ends = courseEnd(body, total);
  const line = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{ fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {t.booking.booked}
        </AppText>
      </View>
      {first ? <AppText style={line}>{t.booking.firstLesson.replace('{when}', whenText(first, view.student.tz, viewer))}</AppText> : null}
      {ends ? <AppText style={line}>{counted(t.booking.courseEnds, total).replace('{date}', localDay(ends))}</AppText> : null}
      <ButtonRow testID="course-done-actions">
        {transfer ? <Button label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
        <Button variant={transfer ? 'secondary' : 'primary'} label={t.salesMoney.done} onPress={onDone} />
      </ButtonRow>
    </View>
  );
}
