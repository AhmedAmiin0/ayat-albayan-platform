import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { updateSettings } from './api';

const s = t.templates.settings;

/**
 * The admin's messaging kill switch (settings.messaging_enabled, docs/12 §3.1). While the CRM
 * still owns the academy's number a warning stays on screen, and turning sending ON always asks
 * first. Turning it OFF is immediate: rows wait in the queue, nothing is lost.
 */
export function MessagingSwitch({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const toggle = useMutation({
    mutationFn: (on: boolean) => updateSettings({ messagingEnabled: on }),
    onSuccess: (next) => {
      queryClient.setQueryData(['settings'], next);
      setConfirming(false);
    },
  });

  return (
    <div className="grid gap-3">
      <p
        role="note"
        className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]"
      >
        <NuqtaGlyph shape="struck" className="mt-1 text-danger" />
        <span>{s.crmWarning}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.messagingEnabled}</span>
        <StatusChip tone={enabled ? 'ok' : 'neutral'} glyph={enabled ? 'fill' : 'struck'} label={enabled ? s.on : s.off} />
        {enabled ? (
          <Button size="sm" variant="danger-quiet" disabled={toggle.isPending} onClick={() => toggle.mutate(false)}>
            {s.disable}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            {s.enableTitle}
          </Button>
        )}
      </div>
      <p className="text-xs text-ink-3">{s.messagingEnabledHint}</p>
      {toggle.isError && !confirming && <FormAlert>{t.common.error}</FormAlert>}
      {confirming && (
        <Dialog
          title={s.enableTitle}
          glyph={{ tone: 'act', shape: 'hollow' }}
          description={s.enableConfirm}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button disabled={toggle.isPending} onClick={() => toggle.mutate(true)}>
                {s.enableYes}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-2">{s.crmWarning}</p>
          {toggle.isError && <FormAlert className="mt-3">{t.common.error}</FormAlert>}
        </Dialog>
      )}
    </div>
  );
}
