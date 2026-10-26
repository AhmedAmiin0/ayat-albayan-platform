import type { GoogleFound, GoogleStatusView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { GoogleBlock } from '../GoogleBlock';
import { fill, formatAt } from '../google-format';
import { useDriveActions } from './use-drive-actions';

const s = t.googleSync.drive;

interface Props {
  status: GoogleStatusView;
  onNote: (message: string) => void;
}

function FoundLine({ label, found }: { label: string; found: GoogleFound | null }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-semibold text-ink-2">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{found ? found.name : <span className="text-ink-3">{s.notFound}</span>}</dd>
    </div>
  );
}

/** The confirmed root folder, when an admin confirmed one. */
function ConfirmedDrive({ drive }: { drive: GoogleStatusView['drive'] }) {
  if (!drive.confirmed_at) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusChip tone="ok" glyph="fill" label={t.googleSync.common.confirmed} />
      <span className="min-w-0 text-sm break-words">{drive.root_folder_name}</span>
      <span className="text-xs text-ink-3">{fill(s.confirmed, { at: formatAt(drive.confirmed_at) })}</span>
    </div>
  );
}

/** What the last search found: the root folder and the summary sheet (or «غير موجود»). */
function DriveFound({ found }: { found: GoogleStatusView['discovery'] }) {
  return (
    <>
      <p className="text-xs text-ink-3">{found ? fill(s.discovered, { at: formatAt(found.at) }) : s.never}</p>
      {found && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <FoundLine label={s.rootFolder} found={found.root_folder} />
          <FoundLine label={s.summarySheet} found={found.summary_sheet} />
        </dl>
      )}
    </>
  );
}

/** «تأكيد المجلد والجدول» while the found root differs from the confirmed one. */
function ConfirmButton({ status, confirm }: { status: GoogleStatusView; confirm: ReturnType<typeof useDriveActions>['confirm'] }) {
  const root = status.discovery?.root_folder ?? null;
  const sheetId = status.discovery?.summary_sheet?.id ?? null;
  if (!root || (status.drive.confirmed_at !== null && status.drive.root_folder_id === root.id)) return null;
  return (
    <Button
      variant="secondary"
      className="justify-self-start"
      disabled={confirm.isPending}
      onClick={() => confirm.mutate({ root_folder_id: root.id, summary_sheet_id: sheetId })}
    >
      {s.confirm}
    </Button>
  );
}

/** «Drive وجداول البيانات»: «ابحث في Google» (read-only discovery), then confirm the root folder and summary sheet. */
export function DriveCard({ status, onNote }: Props) {
  const { discover, confirm, failed } = useDriveActions(onNote);
  const search = (
    <Button size="sm" variant="secondary" disabled={status.connection.status !== 'connected' || discover.isPending} onClick={() => discover.mutate()}>
      {discover.isPending ? s.discovering : s.discover}
    </Button>
  );
  return (
    <GoogleBlock title={s.title} actions={search}>
      <DriveFound found={status.discovery} />
      <ConfirmedDrive drive={status.drive} />
      <ConfirmButton status={status} confirm={confirm} />
      {failed && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
    </GoogleBlock>
  );
}
