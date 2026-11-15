import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { usePortalMe, useRefreshPortal } from '@/portal';
import { ChildSummaryCard } from './ChildSummaryCard';
import { StudentsBody } from './StudentsBody';

/**
 * «أبنائي» (a guardian's tab, canvas Children): a card per child with the last report, «جديد» and
 * the counts; each opens the child, where «حضرها» holds the reports.
 */
export function ChildrenScreen() {
  const { color } = useTheme();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  return (
    <FamilyPage header={<FamilyHeader title={t.portal.app.tabs.children} />} onRefresh={refresh}>
      <StudentsBody
        data={me.data}
        isError={me.isError}
        onRetry={() => void me.refetch()}
        card={(student) => (
          <ChildSummaryCard student={student} kind={me.data?.kind ?? 'guardian'} />
        )}
      />
      <AppText style={{ fontSize: type.size.xs, color: color.ink3, textAlign: 'center' }}>
        {t.portal.app.children.note}
      </AppText>
    </FamilyPage>
  );
}
