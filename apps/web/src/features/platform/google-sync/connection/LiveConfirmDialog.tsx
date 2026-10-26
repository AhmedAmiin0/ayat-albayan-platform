import type { GoogleStatusView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { fill, listOf } from '../google-format';

const c = t.googleSync.confirm;

interface Props {
  status: GoogleStatusView;
  pending: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * «بدء الكتابة الفعلية في Google؟» names exactly where it writes: the main calendar, every mapped
 * teacher calendar and the reports folder (or says none is confirmed). Cancel is the default.
 */
export function LiveConfirmDialog({ status, pending, failed, onCancel, onConfirm }: Props) {
  const { main_calendar: main, teacher_calendars: teachers } = status.targets;
  const folder = status.drive.root_folder_name;
  return (
    <Dialog
      title={c.liveTitle}
      glyph={{ tone: 'act', shape: 'hollow' }}
      description={c.liveBody}
      onClose={onCancel}
      compact
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onCancel}>
            {c.cancel}
          </Button>
          <Button variant="danger" disabled={pending} onClick={onConfirm}>
            {c.ok}
          </Button>
        </>
      }
    >
      <ul className="grid list-disc gap-1.5 ps-5 text-sm text-ink">
        <li className="break-words">{fill(c.mainCalendar, { name: main })}</li>
        <li className="break-words">
          {teachers.length > 0 ? fill(c.teacherCalendars, { names: listOf(teachers) }) : c.noTeacherCalendars}
        </li>
        <li className="break-words">{folder ? fill(c.rootFolder, { name: folder }) : c.noRootFolder}</li>
      </ul>
      <p className="mt-3 text-sm text-ink-2">{c.oldScript}</p>
      {failed && <FormAlert className="mt-3">{t.googleSync.common.saveError}</FormAlert>}
    </Dialog>
  );
}
