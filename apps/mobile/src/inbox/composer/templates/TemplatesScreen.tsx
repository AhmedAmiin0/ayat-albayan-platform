import type { AuthorTemplate } from '@ab/client-core';
import { authorMayEdit, editRoute } from '@ab/shared';
import { router } from 'expo-router';
import { useMeId } from '@/core/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { InsetGroup } from '@/core/ui/surface/inset';
import { TemplateItem } from './TemplateItem';
import { useTemplateList, useTemplateMode } from './templates-api';

/** The admin edits any template Meta lets one edit; an author only their own (authorMayEdit). */
const MAY_EDIT = {
  admin: (tpl: AuthorTemplate) => editRoute(tpl.status) !== null,
  author: (tpl: AuthorTemplate, me: string) => authorMayEdit(tpl, me),
} as const;

/**
 * «القوالب» (owner 2026-11-14) under «المزيد», for sales and the admin: the list with each status,
 * «قالب جديد», and «تعديل» where allowed. `base` = this tree's route (/more/templates,
 * /sales/more/templates).
 */
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
