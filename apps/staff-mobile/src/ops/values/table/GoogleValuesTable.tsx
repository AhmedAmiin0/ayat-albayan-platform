import { t } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { useGoogleStatus } from '@/ops/google-sync/google-status';
import { googleValues } from '@/ops/values/lib/google-values';
import { TableFrame } from './ValuesTable';
import { ValueRow } from './ValueRow';

/** Read-only; mounted only for admins with settings.read, as the API checks. */
export function GoogleValuesTable() {
  const status = useGoogleStatus();
  return (
    <>
      <Note>{t.mobileValues.owned}</Note>
      <TableFrame>
        {googleValues(status.data?.settings).map((row) => (
          <ValueRow key={row.label} label={row.label} value={row.value} editable={false} />
        ))}
      </TableFrame>
    </>
  );
}
