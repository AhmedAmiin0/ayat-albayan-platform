import type { PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export function ChildrenLinks({ students }: { students: readonly PortalStudent[] }) {
  if (students.length === 0) return null;
  return (
    <section aria-labelledby="profile-children" className="grid content-start gap-2">
      <SectionHeader id="profile-children" title={t.portal.app.account.children} />
      <ul className="grid gap-2">
        {students.map((student) => (
          <li key={student.id}>
            <Card asChild pressable>
              <Link
                to="/children/$studentId"
                params={{ studentId: student.id }}
                className="flex min-h-11 items-center gap-3 p-3"
              >
                <Avatar name={student.name} id={student.id} decorative />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-semibold text-ink">{student.name}</span>
                  <Ltr className="justify-self-start text-xs text-ink-3">{student.code}</Ltr>
                </span>
                <Icon name="chevron-left" className="size-4 text-ink-3" />
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
