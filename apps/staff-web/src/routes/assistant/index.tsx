import { createFileRoute } from '@tanstack/react-router';
import { AssistantHome } from '@/features/teaching/classroom/sessions/AssistantHome';
import { InternalMeetingButton } from '@/features/teaching/meetings/internal/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';

export const Route = createFileRoute('/assistant/')({ component: AssistantPage });

/** Today's sessions, then «اجتماع داخلي» and the assistant's own internal meetings. */
function AssistantPage() {
  return (
    <>
      <AssistantHome />
      <div className="mt-6">
        <InternalMeetingButton />
      </div>
      <InternalMeetingsList />
    </>
  );
}
