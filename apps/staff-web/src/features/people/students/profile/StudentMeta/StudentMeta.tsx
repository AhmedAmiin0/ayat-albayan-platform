import { formatPhone } from '@ab/core';
import { secondPhoneOf } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { StudentMetaProps } from './StudentMeta.types';

const LINK = 'text-lapis underline underline-offset-4';

export function StudentMeta({ student }: StudentMetaProps) {
  const { guardian, meeting_link: link } = student;
  // The second number was linked from a lead chat and is removed from the guardian edit.
  const second = secondPhoneOf(guardian.phones);
  const secondRow = second
    ? [[t.guardians.secondPhone, <Ltr key="p2">{formatPhone(second)}</Ltr>] as const]
    : [];
  const meta = [
    [t.students.code, <Ltr key="c">{student.code ?? '—'}</Ltr>],
    [
      t.students.guardian,
      <Link key="g" to="/admin/inbox" search={{ page: 1, phone: guardian.phone_e164 }}
        className={LINK}>
        {guardian.name}
      </Link>,
    ],
    [t.students.guardianPhone, <Ltr key="p">{formatPhone(guardian.phone_e164)}</Ltr>],
    ...secondRow,
    [
      t.students.effectiveLink,
      link ? (
        <a key="l" href={link} target="_blank" rel="noreferrer" dir="ltr"
          className={`block truncate py-3 sm:py-0 ${LINK}`}>
          {link.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span key="l">—</span>
      ),
    ],
  ] as const;
  return (
    <dl className="mb-6 flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-4 text-sm">
      {meta.map(([term, value]) => (
        <div key={term} className="flex min-w-0 items-baseline gap-2">
          <dt className="shrink-0 text-xs text-ink-3">{term}</dt>
          <dd className="min-w-0 truncate text-ink-2">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
