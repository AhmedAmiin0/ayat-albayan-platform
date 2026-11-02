import { riyadhToday, type CoursePauseView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { shape, type, useTheme } from '@/theme';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useResumePause } from './course-pause-api';
import { bannerLines, pauseErrorText, resumedText } from './course-pause-text';
import { ChangeUntilSheet } from './ChangeUntilSheet';

interface CoursePauseBannerProps {
  studentId: string;
  pause: CoursePauseView;
  /** Holds courses.pause: «استئناف» and «تغيير نهاية الإيقاف». */
  canChange: boolean;
  /** A write went through: the file says so under the banner's place. */
  onNotice: (text: string) => void;
}

/**
 * While the course is paused: «الدورة موقوفة مؤقتًا حتى …», «يبدأ الإيقاف في …» before it starts, the reason;
 * then «استئناف» (asks first: the lessons come back from today) and «تغيير نهاية الإيقاف» (a small sheet).
 */
export function CoursePauseBanner({ studentId, pause, canChange, onNotice }: CoursePauseBannerProps) {
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const resume = useResumePause(studentId);
  const c = t.coursePause;
  // academy day (docs/34 b): a pause cuts at the academy's today.
  const lines = bannerLines(pause, riyadhToday());
  const confirm = () =>
    resume.isPending ? undefined : resume.mutate(undefined, { onSuccess: (result) => onNotice(resumedText(result)) });
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.rule, backgroundColor: color.lapisWash }}>
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[600], fontSize: type.size.base, lineHeight: type.lineHeight(type.size.base), color: color.ink }}>
        {lines.title}
      </AppText>
      {lines.starts ? <Note>{lines.starts}</Note> : null}
      {lines.reason ? <Note>{lines.reason}</Note> : null}
      {resume.isError ? <ErrorLine message={pauseErrorText(resume.error)} /> : null}
      {canChange && asking ? (
        <InlineConfirm
          message={`${c.resumeTitle} ${c.resumeBody}`}
          confirmLabel={resume.isPending ? t.common.saving : c.resumeConfirm}
          cancelLabel={t.common.back}
          busy={resume.isPending}
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
        />
      ) : null}
      {canChange && !asking ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: c.resume, onPress: () => setAsking(true) },
            { label: c.changeUntil, onPress: () => setEditing(true) },
          ].map((b) => (
            <View key={b.label} style={{ flex: 1 }}>
              <Button variant="secondary" {...b} />
            </View>
          ))}
        </View>
      ) : null}
      <ChangeUntilSheet
        studentId={studentId}
        pause={editing ? pause : null}
        onClose={() => setEditing(false)}
        onDone={() => {
          setEditing(false);
          onNotice(c.saved);
        }}
      />
    </View>
  );
}
