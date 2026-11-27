import { Ltr, t } from '@ab/web-kit';
import { PersonHead } from '@/features/account/PersonHead';
import type { WhoProps } from '@/features/account/Who/Who.types';
import { codeWords } from './student-head.helpers';

export function StudentHead({ home }: WhoProps) {
  const own = home.students[0];
  const { before, after } = codeWords();
  if (!own) return <PersonHead name={t.portal.app.account.roleStudent} />;
  return (
    <PersonHead
      name={own.name}
      role={t.portal.app.account.roleStudent}
      detail={
        <>
          {before}
          <Ltr>{own.code}</Ltr>
          {after}
        </>
      }
    />
  );
}
