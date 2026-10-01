import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { FormAlert } from './FormAlert';

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

  const actions = (
    <>
      <Button variant="ghost" onClick={onCancel} disabled={busy}>{t.common.cancel}</Button>
      <Button onClick={() => void confirm()} disabled={busy}>{t.common.confirm}</Button>
    </>
  );

  return (
    <Dialog title={t.students.mergeTitle} onClose={onCancel} actions={actions} className="max-w-[560px]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-y border-rule py-3 text-sm">
        {([
          [t.students.mergeKeep, kept],
          [t.students.mergeRemove, merged],
        ] as const).map(([term, s]) => (
          <div key={term} className="contents">
            <dt className="text-ink-3">{term}</dt>
            <dd className="font-semibold">
              <span>{s.name}</span> {s.code && <Ltr className="text-xs font-medium text-ink-3">{s.code}</Ltr>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-[70ch] text-body text-pretty text-ink-2">{text}</p>
      {failed && <FormAlert className="mt-4">{t.common.error}</FormAlert>}
    </Dialog>
  );
}
