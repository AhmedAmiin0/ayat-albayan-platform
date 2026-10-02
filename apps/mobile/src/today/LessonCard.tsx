import {
  applyLessonEvent,
  lessonStatusStyle,
  type CancelRequest,
  type LessonEvent,
  type LessonView,
} from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Ltr } from '@/ui/Ltr';
import { StatusChip } from '@/ui/StatusChip';
import { CancelLesson } from './CancelLesson';
import { lessonSubtitle } from './lesson-text';
import { PackageLine } from './PackageLine';

export interface LessonCardProps {
  lesson: LessonView;
  /** This lesson's change is on its way. */
  busy: boolean;
  /** Why this lesson's last change was refused; the card already shows the old status again. */
  error?: string;
  onConfirm: () => void;
  onCancel: (cancel: CancelRequest) => void;
}

/**
 * A lesson still ahead (or under way): students with their AB codes, the status chip, teacher,
 * length and the student's clock, each student's package line. «يحتاج تأكيد» carries the saffron
 * start edge (docs/07 §12).
 * An action shows only if the API offered it and the shared state machine still allows it from
 * the status on screen (which may already be the optimistic one).
 */
export function LessonCard({ lesson, busy, error, onConfirm, onCancel }: LessonCardProps) {
  const { color } = useTheme();
  const [cancelling, setCancelling] = useState(false);
  const can = (e: LessonEvent) =>
    lesson.allowed_events.includes(e) && applyLessonEvent(lesson.status, e) !== null;
  const canConfirm = can('confirm');
  const canCancel = can('cancel_by_admin');
  const needsConfirm = lesson.status === 'scheduled';
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        borderStartWidth: needsConfirm ? 4 : 1,
        borderStartColor: needsConfirm ? color.act : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          {lesson.students.map((s) => (
            <View key={s.id}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <AppText
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    fontFamily: type.ui[700],
                    fontSize: type.size.base,
                    lineHeight: type.lineHeight(type.size.base),
                    color: color.ink,
                  }}
                >
                  {s.name}
                </AppText>
                <Ltr
                  style={{
                    fontFamily: type.ui[500],
                    fontSize: type.size['2xs'],
                    color: color.ink3,
                  }}
                >
                  {s.code}
                </Ltr>
              </View>
              <PackageLine studentId={s.id} />
            </View>
          ))}
        </View>
        <StatusChip
          {...lessonStatusStyle[lesson.status]}
          label={t.enums.lessonStatus[lesson.status]}
          size="sm"
        />
      </View>
      <AppText
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {lessonSubtitle(lesson)}
      </AppText>
      {error ? <ErrorLine message={error} /> : null}
      {cancelling && canCancel ? (
        <CancelLesson lesson={lesson} onSubmit={onCancel} onClose={() => setCancelling(false)} />
      ) : canConfirm || canCancel ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canCancel ? (
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={t.today.cancel} onPress={() => setCancelling(true)} busy={busy} />
            </View>
          ) : null}
          {canConfirm ? (
            <View style={{ flex: 1 }}>
              <Button label={t.today.confirm} onPress={onConfirm} busy={busy} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
