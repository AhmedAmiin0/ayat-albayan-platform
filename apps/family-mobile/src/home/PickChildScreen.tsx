import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { AppText, t, type, useA11yPref, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useFamilyPick, usePickChild, usePortalMe, useRefreshPortal } from '@/portal';
import { Rise } from '@/ui';
import { ChildSummaryCard } from './ChildSummaryCard';
import { StudentsBody } from './StudentsBody';

/**
 * «اختر الطالب» (owner 2026-11-16): one card per child, rising in one after another; a press
 * makes the app that child's (saved on the phone) and goes home. Forced after sign-in for a
 * guardian of several children with no pick yet (no way back to a childless home); pushed from
 * «حسابي» to switch, with «رجوع».
 */
export function PickChildScreen() {
  const { color } = useTheme();
  const me = usePortalMe();
  const switching = useFamilyPick().state === 'one';
  const pickChild = usePickChild();
  const refresh = useRefreshPortal();
  const still = useA11yPref('reduceMotion');
  const P = t.portal.app.pick;
  const students = me.data?.students ?? [];
  const kind = me.data?.kind ?? 'guardian';
  const choose = (student: PortalStudent) => () => {
    pickChild(student.id);
    // Back down to the tabs' home when pushed from «حسابي»; in place of the picker when forced.
    router.dismissTo('/');
  };
  return (
    <FamilyPage header={<FamilyHeader title={P.title} back={switching} />} onRefresh={refresh}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{P.hint}</AppText>
      <StudentsBody
        data={me.data}
        isError={me.isError}
        onRetry={() => void me.refetch()}
        card={(student) => (
          <Rise index={students.indexOf(student)} still={still}>
            <ChildSummaryCard student={student} kind={kind} onPress={choose(student)} />
          </Rise>
        )}
      />
    </FamilyPage>
  );
}
