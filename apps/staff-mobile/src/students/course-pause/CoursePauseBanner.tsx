import type { CoursePauseView } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useState } from 'react';
import { View } from 'react-native';
import { t, shape, type, useTheme, AppText, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/more';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { useResumePause } from './course-pause-api';
import { bannerLines, pauseErrorText, resumedText } from './course-pause-text';
import { ChangeUntilSheet } from './ChangeUntilSheet';
import { useResumeAsk } from '@/students/course-card/use-resume-ask';

interface CoursePauseBannerProps {
  studentId: string;
  pause: CoursePauseView;
  canChange: boolean;
  /** A write went through: the file says so under the banner's place. */
  onNotice: (text: string) => void;
}

/** Resume asks first, since the lessons come back from today. */
export function CoursePauseBanner({ studentId, pause, canChange, onNotice }: CoursePauseBannerProps) {
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const resume = useResumePause(studentId);
  const c = t.coursePause;
  // academy day (docs/34 b): a pause cuts at the academy's today.
  const lines = bannerLines(pause, riyadhToday());
  const ask = useResumeAsk({ studentId, asking });
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
          message={ask}
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
