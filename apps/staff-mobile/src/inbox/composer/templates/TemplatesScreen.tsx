import type { AuthorTemplate } from '@ab/client-core';
import { authorMayEdit, editRoute } from '@ab/shared';
import { router } from 'expo-router';
import {
  useMeId,
  t,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Button,
  InsetGroup,
} from '@ab/mobile-kit';
import { TemplateItem } from './TemplateItem';
import { useTemplateList, useTemplateMode } from './templates-api';

/** The admin edits any template Meta lets one edit; an author only their own (authorMayEdit). */
const MAY_EDIT = {
  admin: (tpl: AuthorTemplate) => editRoute(tpl.status) !== null,
  author: (tpl: AuthorTemplate, me: string) => authorMayEdit(tpl, me),
} as const;

/** For sales and admin; `base` is this tree's route prefix. */
export function TemplatesScreen({ base }: { base: string }) {
  const mode = useTemplateMode();
  const me = useMeId(true);
  const list = useTemplateList(mode);
  const rows = list.data ?? [];
  const editOf = (tpl: AuthorTemplate) =>
    MAY_EDIT[mode](tpl, me) ? () => router.push(`${base}/${encodeURIComponent(tpl.key)}`) : undefined;
  return (
    <Screen scroll>
      <ScreenHeader title={t.templates.author.title} subtitle={t.templates.author.intro} />
      <Button label={t.templates.author.new} onPress={() => router.push(`${base}/new`)} />
      {list.isError ? (
        <ErrorState message={t.templates.author.loadError} onRetry={() => void list.refetch()} />
      ) : null}
      {list.isSuccess && rows.length === 0 ? <EmptyState title={t.templates.author.empty} /> : null}
      <InsetGroup>
        {rows.map((tpl) => (
          <TemplateItem
            key={tpl.key}
            template={tpl}
            mine={tpl.created_by === me}
            onEdit={editOf(tpl)}
          />
        ))}
      </InsetGroup>
    </Screen>
  );
}
