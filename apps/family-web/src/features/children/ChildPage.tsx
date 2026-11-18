import type { ChildTab } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { pill } from '@ab/web-kit/components/family/brand/pill';
import { PageBody } from '@ab/web-kit/components/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildBody } from './ChildBody';
import { ChildHead } from './ChildHead';

interface Props {
  home: PortalHome;
  studentId: string;
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/**
 * A guardian's child (/children/<id>, board PortalWebChild): the hero with «كل الأبناء» in place
 * of the date, then the tabs.
 */
export function ChildPage({ home, studentId, tab, onTab }: Props) {
  const student = home.students.find((s) => s.id === studentId);
  if (!student) {
    const back = (
      <Link to="/children" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        {t.portal.allChildren}
      </Link>
    );
    return <PageBody><EmptyState title={t.common.notFound} action={back} /></PageBody>;
  }
  const back = (
    <Link to="/children" className={pill({ tone: 'onDark' })}>
      <Icon name="chevron-right" />
      {t.portal.allChildren}
    </Link>
  );
  return (
    <>
      <ChildHead student={student} top={back} />
      <PageBody>
        <ChildBody student={student} kind={home.kind} tab={tab} onTab={onTab} />
      </PageBody>
    </>
  );
}
