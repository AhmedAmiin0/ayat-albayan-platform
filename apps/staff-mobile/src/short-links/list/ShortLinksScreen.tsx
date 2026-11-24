import {
  isListFiltered, listFilterOf, ownerChoices, ownerIdOf, type LinkListView,
} from '@ab/client-core';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  t,
  useMeId,
  useNow,
  useTheme,
  BackButton,
  Button,
  EmptyState,
  ErrorState,
  InsetGroup,
  Note,
  Screen,
  ScreenHeader,
  type Can,
} from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { backWithin } from '@/core/nav/back-within';
import { SearchField } from '@/core/ui/form/SearchField';
import { useShortLinks } from '@/short-links/api/link-hooks';
import { linkHref, moreOf } from '@/short-links/ui/routes';
import { LinkCard } from './LinkCard';
import { FIRST_VIEW, ListFilters, type ListView } from './ListFilters';

interface ShortLinksScreenProps {
  can: Can;
  /** This tree's route: /more/short-links or /sales/more/short-links. */
  base: string;
}

const L = () => t.shortLinks.list;

/** The mine pill maps to the viewer's own id. */
const viewOf = (view: ListView, me: string): LinkListView => ({
  tab: view.status,
  owner: ownerIdOf(view.owner, me),
  search: view.search,
});

type Phase = 'loading' | 'error' | 'empty' | 'rows';

function phaseOf(list: { isError: boolean; data?: unknown }, count: number): Phase {
  if (list.isError) return 'error';
  if (list.data === undefined) return 'loading';
  return count === 0 ? 'empty' : 'rows';
}

function Loading() {
  const { color } = useTheme();
  return <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />;
}

/** Short links (docs/19); every link and owner pills only with short_links.all. */
export function ShortLinksScreen({ can, base }: ShortLinksScreenProps) {
  const [view, setView] = useState<ListView>(FIRST_VIEW);
  const me = useMeId(true);
  const owners = can('short_links.all');
  const list = useShortLinks(listFilterOf(viewOf(view, me)));
  const viewer = { now: useNow(), tz: useViewerTz() };
  const rows = list.data?.rows ?? [];
  const open = (code: string) => router.push(linkHref(base, code));
  const empty = isListFiltered(viewOf(view, me)) ? L().emptyFiltered : L().empty;
  const phases: Record<Phase, () => ReactNode> = {
    loading: () => <Loading />,
    error: () => <ErrorState message={L().loadError} onRetry={() => void list.refetch()} />,
    empty: () => <EmptyState title={empty} />,
    rows: () => null,
  };
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.shortLinks.title}
        size="h2"
        count={list.data?.total}
        leading={<BackButton onPress={() => backWithin(moreOf(base))} />}
      />
      <Note>{t.shortLinks.intro}</Note>
      <Button label={t.shortLinks.new} onPress={() => router.push(`${base}/new`)} />
      <SearchField
        compact
        label={L().searchPlaceholder}
        onSearch={(search) => setView((v) => ({ ...v, search }))}
      />
      <ListFilters
        view={view}
        onChange={setView}
        owners={owners ? ownerChoices(rows).filter((o) => o.id !== me) : null}
      />
      {phases[phaseOf(list, rows.length)]()}
      <InsetGroup testID="short-links-list">
        {rows.map((row) => (
          <LinkCard
            key={row.code}
            row={row}
            viewer={viewer}
            me={owners ? me : null}
            onOpen={open}
          />
        ))}
      </InsetGroup>
    </Screen>
  );
}
