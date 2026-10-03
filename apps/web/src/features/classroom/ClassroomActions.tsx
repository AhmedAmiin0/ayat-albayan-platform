import type { LessonView } from '@ab/shared';
import { JoinButton } from './JoinButton';
import { SendLinkButton } from './SendLinkButton';

/** The admin drawer's online-classroom block: go in, and send each family its link. */
export function ClassroomActions({ lesson }: { lesson: LessonView }) {
  return (
    <div className="grid gap-3">
      <JoinButton lesson={lesson} />
      <SendLinkButton lesson={lesson} />
    </div>
  );
}
