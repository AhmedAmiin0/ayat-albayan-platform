import { familyChildren } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { AppText, t, type, useA11yPref, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useFamilyPick, usePickChild, usePortalMe, useRefreshPortal } from '@/portal';
import { Rise } from '@/ui';
import { ChildSummaryCard } from './ChildSummaryCard';
import { StudentsBody } from './StudentsBody';

/** Forced after sign-in for a guardian of several with no pick; pushed from account to switch. */
export function PickChildScreen() {
  const { color } = useTheme();
  const me = usePortalMe();
  const pick = useFamilyPick();
  // Read once: the pick a press makes must not swap the header while the screen slides away.
  const [switching] = useState(() => pick.state === 'one');
  const pickChild = usePickChild();
  const refresh = useRefreshPortal();
  const still = useA11yPref('reduceMotion');
  // A guardian who also studies sees their own row first.
  const data = me.data && { ...me.data, students: familyChildren(me.data) };
  const students = data?.students ?? [];
  const kind = me.data?.kind ?? 'guardian';
  const choose = (student: PortalStudent) => () => {
    pickChild(student.id);
    router.dismissTo('/');
  };
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
