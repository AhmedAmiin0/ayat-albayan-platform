import type { GoogleStatusView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { GoogleBlock } from './GoogleBlock';
import { ModeControl } from './ModeControl';
import { useSaveSettings } from './use-save-settings';
import { WindowDaysField } from './WindowDaysField';

const s = t.googleSync.switches;
const c = t.googleSync.confirm;

interface Props {
  status: GoogleStatusView;
  onNote: (message: string) => void;
}

/** «التشغيل»: sync on/off (ON asks first, OFF is immediate), the mode, the calendar window. */
export function SyncSwitches({ status, onNote }: Props) {
  const save = useSaveSettings(onNote);
  const [confirming, setConfirming] = useState(false);
  const on = status.settings.enabled;
  const enable = () => save.mutate({ enabled: true }, { onSuccess: () => setConfirming(false) });
  return (
    <GoogleBlock title={s.title}>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{s.enabled}</span>
          <StatusChip tone={on ? 'ok' : 'neutral'} glyph={on ? 'fill' : 'struck'} label={on ? s.on : s.off} />
          {on ? (
            <Button size="sm" variant="danger-quiet" disabled={save.isPending} onClick={() => save.mutate({ enabled: false })}>
              {t.googleSync.web.disable}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
              {c.enableOk}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-3">{s.enabledHint}</p>
      </div>
      <ModeControl status={status} save={save} />
      <WindowDaysField value={status.settings.window_days} save={save} />
      {save.isError && !confirming && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
      {confirming && (
        <Dialog
          title={c.enableTitle}
          glyph={{ tone: 'act', shape: 'hollow' }}
          description={c.enableBody}
          onClose={() => setConfirming(false)}
          compact
          actions={
            <>
              <Button variant="secondary" data-autofocus onClick={() => setConfirming(false)}>
                {c.cancel}
              </Button>
              <Button disabled={save.isPending} onClick={enable}>
                {c.enableOk}
              </Button>
            </>
          }
        >
          {save.isError && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
        </Dialog>
      )}
    </GoogleBlock>
  );
}
