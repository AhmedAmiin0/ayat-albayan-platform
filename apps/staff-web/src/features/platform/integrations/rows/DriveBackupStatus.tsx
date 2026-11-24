import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  backupLines,
  skippedLines,
  useDriveBackup,
  waitingLine,
} from '@/features/platform/integrations/use-drive-backup';

const b = t.integrations.driveBackup;

/** Only for a user the API permits; nothing for the others (docs/45 §5). */
export function DriveBackupStatus() {
  const status = useDriveBackup();
  const view = status.data;
  const waiting = view ? waitingLine(view) : null;
  if (!status.allowed) return null;
  return (
    <section aria-label={b.title} className="grid gap-1 border-t border-rule py-2">
      <h4 className="text-xs font-bold text-ink-2">{b.title}</h4>
      {status.isError && <FormAlert>{b.loadError}</FormAlert>}
      {view?.low_quota && <FormAlert>{b.lowQuota}</FormAlert>}
      {waiting && <FormAlert>{waiting}</FormAlert>}
      {view &&
        [...backupLines(view), ...skippedLines(view)].map((line) => (
          <p key={line} className="text-xs text-ink-3">
            {line}
          </p>
        ))}
    </section>
  );
}
