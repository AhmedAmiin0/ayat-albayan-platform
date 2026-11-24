import type { ChannelAudience } from '@ab/client-core';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';

/** Closed until asked for, then read-only. */
export function MonitorChannel({ studentId, audience }: { studentId: string; audience: Extract<ChannelAudience, 'admin' | 'sales'> }) {
  const tz = useViewerTz();
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-6 grid gap-3" aria-label={t.studentChannel.monitorTitle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3 font-bold">{t.studentChannel.monitorTitle}</h2>
        <Button type="button" variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.studentChannel.hide : t.studentChannel.open}
        </Button>
      </div>
      {open && <ChannelThread refs={{ audience, studentId }} tz={tz} />}
    </section>
  );
}
