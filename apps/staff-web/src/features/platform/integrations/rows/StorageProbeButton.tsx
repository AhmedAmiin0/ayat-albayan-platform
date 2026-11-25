import { Button, FormAlert, t } from '@ab/web-kit';
import { storageProbeProblem, useStorageProbe } from '@/features/platform/integrations/use-storage-probe';

const s = t.integrations.storageProbe;

/** docs/45: tests MinIO before and after the switch. */
export function StorageProbeButton({ onNote }: { onNote: (message: string) => void }) {
  const probe = useStorageProbe();
  return (
    <div className="grid gap-1 py-2">
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={probe.isPending}
          onClick={() => probe.mutate(undefined, { onSuccess: () => onNote(s.done) })}
        >
          {probe.isPending ? s.pending : s.button}
        </Button>
      </div>
      <p className="text-xs text-ink-3">{s.hint}</p>
      {probe.isError && <FormAlert>{storageProbeProblem(probe.error)}</FormAlert>}
    </div>
  );
}
