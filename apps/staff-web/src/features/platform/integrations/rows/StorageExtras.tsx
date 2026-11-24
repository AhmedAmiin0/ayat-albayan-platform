import { DriveBackupStatus } from './DriveBackupStatus';
import { StorageProbeButton } from './StorageProbeButton';

/** docs/45. */
export function StorageExtras({ onNote }: { onNote: (message: string) => void }) {
  return (
    <>
      <StorageProbeButton onNote={onNote} />
      <DriveBackupStatus />
    </>
  );
}
