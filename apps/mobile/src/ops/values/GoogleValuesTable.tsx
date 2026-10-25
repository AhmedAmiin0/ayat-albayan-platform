import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { useGoogleStatus } from '../google-status';
import { googleValues } from './google-values';
import { TableFrame } from './ValuesTable';
import { ValueRow } from './ValueRow';

/**
 * «مزامنة Google» in «القيم» (read-only): the values GoogleSyncCard reads, «تُدار من صفحة أخرى».
 * Mounted only for admins with settings.read, as the API checks.
 */
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
