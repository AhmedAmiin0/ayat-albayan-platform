import { RATING_TEMPLATE, type TemplateView, type ThreadLesson } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from 'react-native';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { TemplateForm } from './TemplateForm';
import { TemplateList, templateName } from './TemplateList';
import type { Outgoing } from '@/inbox/thread/hooks/use-thread';
import { reopenAllowed } from '@/inbox/composer/reopen/reopen-choices';

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

interface TemplatePickerProps {
  visible: boolean;
  /** The guardian's / teacher's next open lessons: a lesson time is picked, never typed (rule 6). */
  lessons: readonly ThreadLesson[];
  /** The thread's display name, for contact_name (null on a new chat). */
  contactName?: string | null;
  /** A teacher's thread: only teacher templates, and only there. */
  teacher: boolean;
  onClose: () => void;
  onSend: (out: Outgoing) => void;
  /** «إعادة فتح المحادثة»: chat-line templates only, opened on the academy's (owner 2026-11-14). */
  reopen?: { preferred: string | undefined };
}

/**
 * «اختار القالب» sheet: this person's approved templates by their Arabic name, then the chosen
 * one's params and preview. Sending closes the sheet; the row shows in the thread at once.
 */
export function TemplatePicker(props: TemplatePickerProps) {
  const templates = useApprovedTemplates(props.visible);
  const reopen = props.reopen;
  const choices = (rows: readonly TemplateView[] | undefined) =>
    reopenAllowed(rows, props.teacher, reopen?.preferred);
  // The reopen sheet opens on the preselected template's form (mounted when tapped).
  const [chosen, setChosen] = useState(() => (reopen ? choices(templates.data).initial : null));
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
          title={chosen ? templateName(chosen) : t.inbox.composer.chooseTemplate}
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
          <TemplateList
            templates={templates}
            teacher={props.teacher}
            onPick={setChosen}
            only={reopen ? (rows) => choices(rows).list : undefined}
          />
        )}
      </Screen>
    </Modal>
  );
}
