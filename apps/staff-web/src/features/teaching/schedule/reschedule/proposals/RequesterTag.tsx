import { isFamilyRequest, type LessonProposalView } from '@ab/schedule';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** «من الأسرة» / «من المعلم/ة»: who asked for the other time (owner 2026-11-17). */
export function RequesterTag({ proposal }: { proposal: LessonProposalView | null }) {
  const family = isFamilyRequest(proposal);
  const label = family ? t.lessons.proposal.fromFamily : t.lessons.proposal.fromTeacher;
  return (
    <StatusChip
      tone={family ? 'act' : 'neutral'}
      glyph={family ? 'half' : 'hollow'}
      label={label}
      size="sm"
      className="me-2 align-middle"
    />
  );
}
