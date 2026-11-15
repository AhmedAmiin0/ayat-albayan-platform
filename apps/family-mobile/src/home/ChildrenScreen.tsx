import { AppText, t, type, useA11yPref, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { usePortalMe, useRefreshPortal } from '@/portal';
import { Rise } from '@/ui';
import { ChildSummaryCard } from './ChildSummaryCard';
import { StudentsBody } from './StudentsBody';

/**
 * «أبنائي» (a guardian's tab, canvas Children): a card per child, rising in one after another,
 * with the next lesson, the counts, the package and the last report; each opens the child, where
 * «حضرها» holds the reports.
 */
export function ChildrenScreen() {
  const { color } = useTheme();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const still = useA11yPref('reduceMotion');
  const students = me.data?.students ?? [];
  return (
    <FamilyPage header={<FamilyHeader title={t.portal.app.tabs.children} />} onRefresh={refresh}>
      <StudentsBody
        data={me.data}
        isError={me.isError}
        onRetry={() => void me.refetch()}
        card={(student) => (
          <Rise index={students.indexOf(student)} still={still}>
            <ChildSummaryCard student={student} kind={me.data?.kind ?? 'guardian'} />
          </Rise>
        )}
      />
      <AppText style={{ fontSize: type.size.xs, color: color.ink3, textAlign: 'center' }}>
        {t.portal.app.children.note}
      </AppText>
    </FamilyPage>
  );
}
