import { counted } from '@ab/core';
import { Avatar, Pill, t } from '@ab/web-kit';
import type { CardHeadProps } from './CardHead.types';

export function CardHead({ student, self, newReports }: CardHeadProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={student.name} id={student.id} decorative />
        <div className="grid min-w-0 gap-0.5">
          <h2 className="font-display text-h3 font-bold">
            {student.name}
            {self && (
              <span className="ms-2 text-xs font-semibold text-ink-2">{t.portal.app.pick.me}</span>
            )}
          </h2>
          <p className="text-xs text-ink-3 tabular-nums">
            {t.portal.code.replace('{code}', student.code)}
          </p>
        </div>
      </div>
      {newReports > 0 && <Pill tone="act">{counted(t.portal.newReports, newReports)}</Pill>}
    </header>
  );
}
