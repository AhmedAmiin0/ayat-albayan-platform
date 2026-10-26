import type { GoogleStatusView, GoogleSyncMode } from '@ab/shared';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { LiveConfirmDialog } from './LiveConfirmDialog';
import type { useSaveSettings } from '../use-save-settings';

const s = t.googleSync.switches;

interface Props {
  status: GoogleStatusView;
  save: ReturnType<typeof useSaveSettings>;
}

/** «تجربة بدون كتابة | كتابة فعلية»: back to the dry run is immediate, live asks first naming its targets. */
export function ModeControl({ status, save }: Props) {
  const [confirming, setConfirming] = useState(false);
  const mode = status.settings.mode;
  const pick = (next: GoogleSyncMode) => {
    if (next === mode) return;
    if (next === 'live') {
      save.reset();
      setConfirming(true);
    }
    else save.mutate({ mode: 'dry_run' });
  };
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">{s.mode}</span>
      <SegmentedControl
        label={s.mode}
        value={mode}
        onChange={pick}
        options={[
          { value: 'dry_run', label: s.dryRun },
          { value: 'live', label: s.live },
        ]}
      />
      <p className="text-xs text-ink-3">{mode === 'live' ? s.liveHint : s.dryRunHint}</p>
      {confirming && (
        <LiveConfirmDialog
          status={status}
          pending={save.isPending}
          failed={save.isError}
          onCancel={() => setConfirming(false)}
          onConfirm={() => save.mutate({ mode: 'live' }, { onSuccess: () => setConfirming(false) })}
        />
      )}
    </div>
  );
}
