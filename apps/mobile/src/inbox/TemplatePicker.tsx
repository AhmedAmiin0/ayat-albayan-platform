import { forAudience, RATING_TEMPLATE, type TemplateView, type ThreadLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Modal, View } from 'react-native';
import { useSendsAllTemplates } from '@/auth/use-permissions';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { TemplateForm } from './TemplateForm';
import type { Outgoing } from './use-thread';

const PATH = '/messaging/templates';

/**
 * GET /messaging/templates (docs/12 T1), kept to what Meta has approved: nothing else can go out.
 * lesson_rating is left out: only the web inbox's «إرسال تقييم الحلقة» picks its lesson and buttons.
 */
export function useApprovedTemplates(enabled: boolean) {
  return useQuery({
    queryKey: pathKey(PATH),
    queryFn: () => apiFetch<TemplateView[]>(PATH),
    select: (rows) => rows.filter((row) => row.status === 'approved' && row.key !== RATING_TEMPLATE),
    enabled,
  });
}

const names: Record<string, string> = t.templates.names;

export interface TemplatePickerProps {
  visible: boolean;
  /** The guardian's / teacher's next open lessons: a lesson time is picked, never typed (rule 6). */
  lessons: readonly ThreadLesson[];
  /** The thread's display name, for contact_name (null on a new chat). */
  contactName?: string | null;
  /** A teacher's thread: only teacher templates, and only there. */
  teacher: boolean;
  onClose: () => void;
  onSend: (out: Outgoing) => void;
}

/**
 * «اختار القالب» sheet: this person's approved templates by their Arabic name, then the chosen
 * one's params and preview. Sending closes the sheet; the row shows in the thread at once.
 */
export function TemplatePicker(props: TemplatePickerProps) {
  const templates = useApprovedTemplates(props.visible);
  // Without templates.manage or templates.send_all, and always for sales, an assistant or a teacher, only
  // the admin's allow-list (owner 2026-10-12 / 10-15 / 10-18): none ticked (or not imported yet) is not «nothing approved».
  const restricted = !useSendsAllTemplates();
  const offered = (templates.data ?? []).filter((row) => forAudience(row.key, props.teacher));
  const [chosen, setChosen] = useState<TemplateView | null>(null);
  const close = () => {
    setChosen(null);
    props.onClose();
  };
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <Screen sheet>
        <ScreenHeader
          title={chosen ? (names[chosen.key] ?? chosen.key) : t.inbox.composer.chooseTemplate}
          trailing={<Button variant="ghost" label={t.common.close} onPress={close} />}
        />
        {chosen ? (
          <TemplateForm
            template={chosen}
            lessons={props.lessons}
            contactName={props.contactName}
            onBack={() => setChosen(null)}
            onSend={(out) => {
              setChosen(null);
              props.onSend(out);
            }}
          />
        ) : (
          <FlatList
            style={{ flex: 1, marginHorizontal: -16 }}
            data={offered}
            keyExtractor={(row) => row.key}
            renderItem={({ item }) => (
              <ListRow
                title={names[item.key] ?? item.key}
                subtitle={item.body_ar}
                onPress={() => setChosen(item)}
              />
            )}
            // While the list loads, say so: a slow answer is not an empty white sheet.
            ListEmptyComponent={
              templates.isError ? (
                <ErrorState onRetry={() => void templates.refetch()} />
              ) : (
                <View style={{ padding: 16 }}>
                  {templates.isPending ? (
                    <Note>{t.common.loading}</Note>
                  ) : (
                    <EmptyState title={restricted ? t.inbox.composer.noAllowed : t.inbox.composer.noApproved} />
                  )}
                </View>
              )
            }
          />
        )}
      </Screen>
    </Modal>
  );
}
