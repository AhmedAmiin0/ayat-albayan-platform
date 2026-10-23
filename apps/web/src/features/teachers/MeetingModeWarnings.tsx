import { useQuery } from '@tanstack/react-query';
import { sectionId } from '@/components/settings/section-id';
import { integrationsQuery } from '@/features/integrations/integrations-api';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';
import { joinStatus, livekitConfigured, meetingModeNotes, type MeetingModeNote } from './meeting-mode-notes';

const NOTE = 'rounded-md bg-sunk px-3 py-2 text-sm text-ink-2';
/** The templates live in the messaging section of /admin/settings, where the admin submits one to Meta. */
const TEMPLATES_HREF = `/admin/settings#${sectionId('messaging')}`;

interface Props {
  /** The live region's id: the radio group points at it (aria-describedby). */
  id: string;
  /** effectivePlatform(form mode, academy default); null = not known yet, so no note. */
  platform: boolean | null;
  /** The form's fixed link, as typed. */
  link: string;
}

function NoteText({ note, livekit }: { note: MeetingModeNote; livekit: boolean | null }) {
  const T = t.teachers;
  if (note === 'noLink') return <>{T.meetingModeNoLink}</>;
  if (note === 'livekitUnset') return <>{T.meetingModeLivekitUnset}</>;
  const text = {
    templatePending: T.meetingModeTemplatePending,
    templatePaused: T.meetingModeTemplatePaused,
    templateNotApproved: T.meetingModeTemplateNotApproved,
  }[note];
  return (
    <>
      {text}
      {/* Without LiveKit the teacher gets no link either (reminders.links.ts): only say so when it is set. */}
      {livekit === true && ` ${T.meetingModeTeacherOnly}`}{' '}
      {/* A new tab: this sits inside the unsaved teacher form, which a page load would throw away. */}
      <a href={TEMPLATES_HREF} target="_blank" rel="noopener noreferrer" className="font-semibold text-lapis underline underline-offset-4">
        {T.meetingModeTemplatesLink}
      </a>
    </>
  );
}

/**
 * Non-blocking notes under «طريقة حضور الحلقات» (save stays allowed), from meetingModeNotes. One
 * always-mounted polite live region holds them, so a note that appears after the lists load is
 * announced. A failed or forbidden read is unknown: no note rests on it.
 */
export function MeetingModeWarnings({ id, platform, link }: Props) {
  const known = platform !== null;
  const templates = useQuery({ ...templatesQuery, enabled: known });
  const integrations = useQuery({ ...integrationsQuery, enabled: known });
  const livekit = livekitConfigured(integrations.isSuccess ? integrations.data : undefined);
  const join = joinStatus(templates.isSuccess ? templates.data : undefined);
  const settled = !templates.isPending && !integrations.isPending;
  const notes = meetingModeNotes({ platform, link, join, livekit, settled });
  // Never display:none while empty: a live region revealed with its first note is often not announced.
  return (
    <div id={id} role="status" aria-live="polite" className="mt-2 grid gap-2 empty:mt-0">
      {notes.map((note) => (
        <p key={note} className={NOTE}>
          <NoteText note={note} livekit={livekit} />
        </p>
      ))}
    </div>
  );
}
