import { isFamilyRequest, type LessonProposalView } from '@ab/schedule';
import { StatusChip, t } from '@ab/web-kit';

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
