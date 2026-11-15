import type { PortalHome, PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, EmptyState, ErrorState, SkeletonCard } from '@ab/mobile-kit';
import { type HomeState, homeState } from './home-state';

interface StudentsBodyProps {
  data: PortalHome | undefined;
  isError: boolean;
  onRetry: () => void;
  /** One student's card. */
  card: (student: PortalStudent) => ReactNode;
}

const SKELETONS = ['a', 'b'] as const;

const BODY: Record<HomeState, (p: StudentsBodyProps) => ReactNode> = {
  loading: () => (
    <View accessible accessibilityLabel={t.familyApp.home.loading} style={{ gap: 12 }}>
      {SKELETONS.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </View>
  ),
  error: (p) => <ErrorState onRetry={p.onRetry} />,
  empty: () => <EmptyState title={t.familyApp.home.empty} />,
  list: (p) => (
    <View style={{ gap: 16 }}>
      {p.data?.students.map((student) => (
        <View key={student.id}>{p.card(student)}</View>
      ))}
    </View>
  ),
};

/** The login's students as cards: skeletons while /portal/me loads, then one card each. */
export function StudentsBody(props: StudentsBodyProps) {
  return BODY[homeState(props)](props);
}
