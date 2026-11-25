import { studentStatusStyle } from '@ab/money';
import { Ltr, StatusChip, t } from '@ab/web-kit';
import type { StudentRef } from '@ab/shared';

export function SiblingsStrip({ siblings }: { siblings: StudentRef[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-ink-2">
      <span>{`${t.students.siblings}:`}</span>
      {siblings.map((s) => (
        <span
          key={s.id}
          className="ab-lift inline-flex items-center gap-2 rounded-md border border-rule bg-raised py-[5px] ps-1.5 pe-2.5 font-semibold text-ink"
        >
          <StatusChip {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} size="sm" />
          <span>{s.name}</span>
          <Ltr className="text-2xs font-medium text-ink-3">{s.code}</Ltr>
        </span>
      ))}
    </div>
  );
}
