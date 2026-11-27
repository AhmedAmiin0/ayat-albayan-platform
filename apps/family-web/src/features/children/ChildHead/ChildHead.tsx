import { t } from '@ab/web-kit';
import type { ChildHeadProps } from './ChildHead.types';

/** The child's name (the page's heading) and code; `over`: a greeting on a student's home. */
export function ChildHead({ student, over }: ChildHeadProps) {
  return (
    <header className="grid gap-0.5">
      {over && <p className="text-sm text-ink-2">{over}</p>}
      <h1 className="font-display text-h2 font-bold">{student.name}</h1>
      <p className="text-xs text-ink-3 tabular-nums">
        {t.portal.code.replace('{code}', student.code)}
      </p>
    </header>
  );
}
