import { forAudience, type TemplateView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import { useSendsAllTemplates } from '@/core/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';

const names: Record<string, string> = t.templates.names;

/** A template's Arabic name (its key until one is written). */
export const templateName = (tpl: TemplateView): string => names[tpl.key] ?? tpl.key;

interface TemplateListProps {
  /** useApprovedTemplates: the caller's allowed, approved templates. */
  templates: UseQueryResult<TemplateView[]>;
  /** A teacher's thread: only teacher templates, and only there. */
  teacher: boolean;
  onPick: (tpl: TemplateView) => void;
  /** Narrows the list (the reopen sheet: chat-line templates only). */
  only?: ((rows: TemplateView[]) => TemplateView[]) | undefined;
}

/**
 * The approved templates by their Arabic name and body, in one inset card (owner 2026-10-28: one
 * container rule): the chat's «اختر القالب» sheet and «محادثة جديدة»'s template step.
 */
export function TemplateList({ templates, teacher, onPick, only }: TemplateListProps) {
  // Without templates.manage or templates.send_all, and always for sales, an assistant or a
  // teacher, only the admin's allow-list (owner 2026-10-12 / 10-15 / 10-18): none ticked (or not
  // imported yet) is not «nothing approved».
  const restricted = !useSendsAllTemplates();
  const audience = (templates.data ?? []).filter((row) => forAudience(row.key, teacher));
  const offered = only ? only(audience) : audience;
  const row = ({ item }: ListRenderItemInfo<TemplateView>) => (
    <ListRow title={templateName(item)} subtitle={item.body_ar} onPress={() => onPick(item)} />
  );
  const cells = useInsetRows(row, offered.length);
  const empty = restricted ? t.inbox.composer.noAllowed : t.inbox.composer.noApproved;
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 16 }}
      data={offered}
      keyExtractor={(tpl) => tpl.key}
      {...cells}
      // While the list loads, say so: a slow answer is not an empty white sheet.
      ListEmptyComponent={
        templates.isError ? (
          <ErrorState onRetry={() => void templates.refetch()} />
        ) : (
          <View style={{ paddingVertical: 16 }}>
            {templates.isPending ? <Note>{t.common.loading}</Note> : <EmptyState title={empty} />}
          </View>
        )
      }
    />
  );
}
