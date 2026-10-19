import { useQuery } from '@tanstack/react-query';
import { templatesQuery } from '@/features/templates/api';
import { t } from '@/lib/i18n';

const JOIN_TEMPLATE = 'lesson_join_link';
const NOTE = 'rounded-md bg-sunk px-3 py-2 text-sm text-ink-2';

interface Props {
  /** usesPlatform(form mode, settings.meeting_link_auto). */
  platform: boolean;
  /** The form's fixed link, as typed. */
  link: string;
}

/**
 * Non-blocking notes under «طريقة حضور الحلقات» (save stays allowed): a fixed-link teacher with no
 * link sends families nothing; a platform teacher's families get no join link while lesson_join_link
 * is not approved. The template note waits for the templates list: nothing while loading or failed.
 */
export function MeetingModeWarnings({ platform, link }: Props) {
  const templates = useQuery({ ...templatesQuery, enabled: platform });
  if (!platform) {
    return link.trim() === '' ? <p role="note" className={NOTE}>{t.teachers.meetingModeNoLink}</p> : null;
  }
  if (!templates.isSuccess) return null;
  const approved = templates.data.some((x) => x.key === JOIN_TEMPLATE && x.status === 'approved');
  return approved ? null : <p role="note" className={NOTE}>{t.teachers.meetingModeTemplatePending}</p>;
}
