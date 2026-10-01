import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { Modal } from './Modal';

type Named = { name: string; code?: string | null };

export type MergeDialogProps = {
  /** Survives the merge (keeps its code and history). */
  kept: Named;
  /** Folded into `kept`; its row is snapshotted into the merge history (R-STU-03). */
  merged: Named;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

const label = (s: Named) => (s.code ? `${s.name} (${s.code})` : s.name);

/** Confirms a merge with the exact wording of students.mergeConfirm. */
export function MergeDialog({ kept, merged, onConfirm, onCancel }: MergeDialogProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = t.students.mergeConfirm.replace('{merged}', label(merged)).replace('{kept}', label(kept));

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t.students.mergeTitle}>
      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t.students.mergeKeep}</dt>
        <dd>{label(kept)}</dd>
        <dt className="text-muted-foreground">{t.students.mergeRemove}</dt>
        <dd>{label(merged)}</dd>
      </dl>
      <p className="mb-4">{text}</p>
      {failed && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {t.common.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {t.common.cancel}
        </Button>
        <Button onClick={() => void confirm()} disabled={busy}>
          {t.common.confirm}
        </Button>
      </div>
    </Modal>
  );
}
