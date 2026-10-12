import { forAudience, RATING_TEMPLATE, type TemplateView, type ThreadLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Modal, View } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
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
  // A salesperson lists only the starters the admin ticked: none ticked is not «nothing approved».
  const sales = useHolds('self.sales');
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
      <Screen>
        <ScreenHeader
          title={chosen ? (names[chosen.key] ?? chosen.key) : t.inbox.composer.chooseTemplate}
          trailing={<Button variant="ghost" label={t.common.close} onPress={close} />}
        />
        {chosen ? (
          <TemplateForm
            template={chosen}
            lessons={props.lessons}
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
            ListEmptyComponent={
              templates.isError ? (
                <ErrorState onRetry={() => void templates.refetch()} />
              ) : templates.isSuccess ? (
                <View style={{ padding: 16 }}>
                  <EmptyState title={sales ? t.inbox.composer.noStarters : t.inbox.composer.noApproved} />
                </View>
              ) : null
            }
          />
        )}
      </Screen>
    </Modal>
  );
}
