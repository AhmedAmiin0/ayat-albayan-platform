import { requestChip, type RequestChip } from '@ab/client-core';
import type { PortalLesson, Tone } from '@ab/shared';
import { StatusMark } from '@ab/web-kit/components/ui/surface/status-mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useLessonStatusText } from '@ab/web-kit/lib/settings/lesson-status-text';

/** The family's request outranks the lesson's status. */
const REQUEST_TONE: Readonly<Record<RequestChip, Tone>> = { pendingChip: 'act', rejectedChip: 'bad' };

/** Shown on every portal lesson card and the family week. */
export function FamilyChip({ lesson }: { lesson: PortalLesson }) {
  const status = useLessonStatusText();
  const chip = requestChip(lesson);
  const mark = chip
    ? { tone: REQUEST_TONE[chip], label: t.portal.actions[chip] }
    : status.chip(lesson.status);
  return <StatusMark tone={mark.tone} label={mark.label} />;
}
