import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyPage } from '@/nav';
import { useRefreshPortal } from '@/portal';
import { ChildHomeCard } from './ChildHomeCard';
import { GreetingHeader } from './GreetingHeader';
import { StudentsBody } from './StudentsBody';

interface GuardianHomeProps {
  me: PortalHome | undefined;
  isError: boolean;
  onRetry: () => void;
}

/** A guardian's home (canvas Home): «أبناؤك» and one card per child; pull to refresh. */
export function GuardianHome({ me, isError, onRetry }: GuardianHomeProps) {
  const { color } = useTheme();
  const refresh = useRefreshPortal();
  const A = t.portal.app.home;
  const count = me?.students.length;
  return (
    <FamilyPage header={<GreetingHeader title={A.greeting} />} onRefresh={refresh}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
          {A.children}
        </AppText>
        {count === undefined ? null : (
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{String(count)}</AppText>
        )}
      </View>
      <StudentsBody
        data={me}
        isError={isError}
        onRetry={onRetry}
        card={(student) => (
          <ChildHomeCard student={student} money={seesMoney(portalViewer('guardian', student))} />
        )}
      />
    </FamilyPage>
  );
}
