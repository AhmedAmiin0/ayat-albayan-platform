import { DriveBackupStatus } from './DriveBackupStatus';
import { StorageProbeButton } from './StorageProbeButton';

/** Under «التخزين»: MinIO's probe, then the Drive backup's status line (docs/45). */
export function StorageExtras({ onNote }: { onNote: (message: string) => void }) {
  return (
    <>
      <StorageProbeButton onNote={onNote} />
      <DriveBackupStatus />
    </>
  );
}
