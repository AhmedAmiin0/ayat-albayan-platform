import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, EmptyState, ErrorState, SkeletonCard } from '@ab/mobile-kit';
import { ChildCard } from './ChildCard';
import { type HomeState, homeState } from './home-state';
import type { PortalChild, PortalMe } from './portal-me';

interface HomeBodyProps {
  data: PortalMe | undefined;
  isError: boolean;
  onRetry: () => void;
  onOpen: (child: PortalChild) => void;
}

const SKELETONS = ['a', 'b'] as const;

const BODY: Record<HomeState, (p: HomeBodyProps) => ReactNode> = {
  loading: () => (
    <View accessible accessibilityLabel={t.familyApp.home.loading} style={{ gap: 12 }}>
      {SKELETONS.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </View>
  ),
  error: (p) => <ErrorState onRetry={p.onRetry} />,
  empty: () => <EmptyState title={t.familyApp.home.empty} />,
  list: (p) =>
    p.data?.students.map((child) => <ChildCard key={child.id} child={child} onOpen={p.onOpen} />),
};

/** Home's list: skeletons while /portal/me loads, then one card per child (docs/50 §6). */
export function HomeBody(props: HomeBodyProps) {
  return BODY[homeState(props)](props);
}
