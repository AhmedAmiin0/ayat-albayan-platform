import { createFileRoute } from '@tanstack/react-router';
import { AssistantHome } from '@/features/classroom/sessions/AssistantHome';
import { InternalMeetingButton } from '@/features/meetings/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/meetings/InternalMeetingsList';

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
