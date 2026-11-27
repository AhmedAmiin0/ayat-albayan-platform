import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { Rise } from '@/ui';
import { ChildSummaryCard } from '@/home/ChildSummaryCard';
import { StudentsBody } from '@/home/StudentsBody';
import { usePickChildScreen } from './use-pick-child-screen';

/** Forced after sign-in for a guardian of several with no pick; pushed from account to switch. */
export function PickChildScreen() {
  const { color } = useTheme();
  const { me, switching, refresh, still, data, students, kind, choose } = usePickChildScreen();
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.pick.title} back={switching} />}
      onRefresh={refresh}
    >
      <StudentsBody
        data={data}
        isError={me.isError}
        onRetry={() => void me.refetch()}
        card={(student) => (
          <Rise index={students.indexOf(student)} still={still}>
            <ChildSummaryCard student={student} kind={kind} onPress={choose(student)} />
          </Rise>
        )}
      />
      {switching || students.length === 0 ? null : (
        <AppText style={{ fontSize: type.size.xs, color: color.ink3, textAlign: 'center' }}>
          {t.portal.app.pick.hint}
        </AppText>
      )}
    </FamilyPage>
  );
}
