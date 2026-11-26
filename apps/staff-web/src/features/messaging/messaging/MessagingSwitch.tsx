import type { AcademySettings } from '@ab/settings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ConfirmSwitchDialog, Button, FormAlert, NuqtaGlyph, StatusChip, t } from '@ab/web-kit';
import { sendGateQuery } from './api';
import { useGateSwitch } from './gate-api';
import { sendingChip } from './sending-chip';
import { queuedText, ServerGateNote } from './ServerGateNote';

const s = t.templates.settings;
const warning =
  'flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]';

/** docs/26b §6a 1.2-1.3: the cut-over is marked and unmarked on the safety settings page. */
function SafetyLink() {
  return (
    <Link
      to="/admin/settings/communications"
      search={{ tab: 'safety' }}
      className="inline-flex min-h-11 items-center text-xs font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
    >
      {t.communicationsHub.crmOpenSafety}
    </Link>
  );
}

/** The only sending gate (docs/23: no env fuse); OFF applies before the next message is sent. */
export function MessagingSwitch({ settings }: { settings: AcademySettings }) {
  const queryClient = useQueryClient();
  const gate = useQuery(sendGateQuery);
  const [confirming, setConfirming] = useState<'on' | 'off' | null>(null);
  const enabled = settings.messaging_enabled;
  const save = useGateSwitch({
    onSaved: async () => {
      setConfirming(null);
      await queryClient.invalidateQueries({ queryKey: sendGateQuery.queryKey });
    },
  });

  return (
    <div className="grid gap-3">
      {!settings.crm_cutover_done && (
        <div className="grid justify-items-start gap-1.5">
          <p role="note" className={warning}>
            <NuqtaGlyph shape="struck" className="mt-1 text-danger" />
            <span>{s.crmWarning}</span>
          </p>
          <SafetyLink />
        </div>
      )}
      {settings.crm_cutover_done && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span>{s.crmMoved}</span>
          <SafetyLink />
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.messagingEnabled}</span>
        <StatusChip {...sendingChip(enabled, gate.data)} />
        {enabled ? (
          <Button
            size="sm"
            variant="danger-quiet"
            disabled={save.isPending}
            onClick={() => {
              save.reset();
              setConfirming('off');
            }}
          >
            {s.disable}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              save.reset();
              setConfirming('on');
            }}
          >
            {s.enableTitle}
          </Button>
        )}
      </div>
      {gate.data && <ServerGateNote gate={gate.data} />}
      <p className="text-xs text-ink-3">{s.messagingEnabledHint}</p>
      {save.isError && !confirming && <FormAlert>{t.common.error}</FormAlert>}
      {confirming === 'on' && (
        <ConfirmSwitchDialog
          title={s.enableTitle}
          description={s.enableConfirm}
          yes={s.enableYes}
          onYes={() => save.mutate({ sending: true })}
          onClose={() => setConfirming(null)}
          pending={save.isPending}
          failed={save.isError}
        >
          {gate.data && (
            <p className="text-sm font-semibold text-ink">
              {queuedText(gate.data.queued)} {gate.data.queued > 0 ? s.queuedGoOut : ''}
            </p>
          )}
          {!settings.crm_cutover_done && <p className="mt-2 text-sm text-ink-2">{s.crmWarning}</p>}
        </ConfirmSwitchDialog>
      )}
      {confirming === 'off' && (
        <ConfirmSwitchDialog
          title={s.disableTitle}
          description={s.disableConfirm}
          yes={s.disableYes}
          onYes={() => save.mutate({ sending: false })}
          onClose={() => setConfirming(null)}
          pending={save.isPending}
          failed={save.isError}
        />
      )}
    </div>
  );
}
