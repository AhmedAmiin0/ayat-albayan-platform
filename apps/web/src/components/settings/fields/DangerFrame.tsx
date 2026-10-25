import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';

/** The frame of a switch that reaches families (sending, automatic messages, the CRM cut-over). */
export function DangerFrame({ children }: { children: ReactNode }) {
  return (
    <div data-danger="true" className="grid gap-2 rounded-md border-s-[3px] border-s-danger bg-danger-soft px-3 py-3">
      <p className="text-2xs font-semibold text-danger">{t.config.danger}</p>
      {children}
    </div>
  );
}
