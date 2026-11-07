import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { backupLines, useDriveBackup } from '@/features/platform/integrations/use-drive-backup';

const b = t.integrations.driveBackup;

/** Under «التخزين» (docs/45 §5): last archive, raw → compressed, errors, Drive's free space. */
export function DriveBackupStatus() {
  const status = useDriveBackup();
  const view = status.data;
  return (
    <section aria-label={b.title} className="grid gap-1 border-t border-rule py-2">
      <h4 className="text-xs font-bold text-ink-2">{b.title}</h4>
      {status.isError && <FormAlert>{b.loadError}</FormAlert>}
      {view?.low_quota && <FormAlert>{b.lowQuota}</FormAlert>}
      {view &&
        backupLines(view).map((line) => (
          <p key={line} className="text-xs text-ink-3">
            {line}
          </p>
        ))}
    </section>
  );
}
