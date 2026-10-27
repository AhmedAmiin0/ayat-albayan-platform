import type { ChannelAudience } from '@ab/client-core';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { viewerTz } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { ChannelThread } from './ChannelThread';

/**
 * A monitor's way into a student's channel (the admin's student page, the assistant's «طلابي»): closed
 * until asked for, then the thread read-only with its «للاطلاع فقط» note.
 */
export function MonitorChannel({ studentId, audience }: { studentId: string; audience: Extract<ChannelAudience, 'admin' | 'sales'> }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-6 grid gap-3" aria-label={t.studentChannel.monitorTitle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3 font-bold">{t.studentChannel.monitorTitle}</h2>
        <Button type="button" variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.studentChannel.hide : t.studentChannel.open}
        </Button>
      </div>
      {open && <ChannelThread refs={{ audience, studentId }} tz={viewerTz()} />}
    </section>
  );
}
