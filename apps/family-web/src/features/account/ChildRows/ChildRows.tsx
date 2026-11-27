import { familyChildren } from '@ab/client-core';
import { SectionHeader, t } from '@ab/web-kit';
import { ChildRow } from '@/features/account/ChildRow';
import type { ChildRowsProps } from './ChildRows.types';
import { useChildRows } from './use-child-rows';

/** A guardian who studies comes first; a row switches the child and goes home. */
export function ChildRows({ home }: ChildRowsProps) {
  const { shown, choose, labelOf } = useChildRows({ home });
  return (
    <section aria-labelledby="account-children" className="grid gap-2">
      <SectionHeader id="account-children" title={t.portal.app.account.children} />
      <ul className="grid gap-2">
        {familyChildren(home).map((student) => (
          <li key={student.id}>
            <ChildRow
              student={student}
              label={labelOf(student)}
              current={student.id === shown}
              onChoose={() => choose(student.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
