import type { AssistantStatementLineView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { StatementLines } from './StatementLines';

/** «بنود الكشف» folded under its statement (the web's <details>), opened on demand. */
export function LinesToggle({ lines }: { lines: readonly AssistantStatementLineView[] }) {
  const [open, setOpen] = useState(false);
  if (lines.length === 0) return null;
  const m = t.mobileSalesMoney;
  return (
    <>
      <Button variant="ghost" label={open ? m.hideLines : `${t.assistantPortal.earnings.lines} · ${m.showLines}`} onPress={() => setOpen((o) => !o)} />
      {open ? <StatementLines lines={lines} /> : null}
    </>
  );
}
