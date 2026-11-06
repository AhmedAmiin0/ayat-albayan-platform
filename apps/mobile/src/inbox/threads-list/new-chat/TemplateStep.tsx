import { forAudience, formatPhone, type TemplateView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BackButton } from '@/core/ui/navigation/BackButton';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { TemplateForm } from '@/inbox/composer/TemplateForm';
import { TemplateList, templateName } from '@/inbox/composer/TemplateList';
import { useApprovedTemplates } from '@/inbox/composer/TemplatePicker';
import { type FoundNumber, useFirstTemplate } from './use-new-chat';

interface TemplateStepProps {
  /** A number with no message yet (an existing chat never reaches this step). */
  found: FoundNumber;
  /** Back to the number. */
  onBack: () => void;
  onClose: () => void;
  /** The API took the template: the sheet closes and the new chat opens on its queued bubble. */
  onSent: () => void;
}

/** The send in flight, or why it did not go (the form stays, its retry keeps the id). */
function SendStatus({ error, pending }: { error: string | null; pending: boolean }) {
  if (error) return <ErrorLine message={error} />;
  return pending ? <Note>{t.inbox.newChat.sending}</Note> : null;
}

/**
 * Steps 2–3: the caller's allowed templates (GET /messaging/templates: the allow-list for sales and
 * assistants; none → «noAllowed» and nothing to send), then the picked one's params and preview
 * (TemplateForm, the chat's own) and «أرسل». The header's back goes one step.
 */
export function TemplateStep({ found, onBack, onClose, onSent }: TemplateStepProps) {
  const templates = useApprovedTemplates(true);
  const [chosen, setChosen] = useState<TemplateView | null>(null);
  const first = useFirstTemplate(found.phone, onSent);
  const unpick = () => setChosen(null);
  // Why a template (WhatsApp's rule), over a list that has one; none allowed says so on its own.
  const offers = (templates.data ?? []).some((row) => forAudience(row.key, false));
  return (
    <>
      <ScreenHeader
        title={chosen ? templateName(chosen) : t.inbox.composer.chooseTemplate}
        subtitle={ltr(formatPhone(found.phone))}
        leading={<BackButton testID="new-chat-back" busy={first.pending} onPress={chosen ? unpick : onBack} />}
        trailing={
          <Button variant="ghost" label={t.common.close} disabled={first.pending} onPress={onClose} />
        }
      />
      <SendStatus error={first.error} pending={first.pending} />
      {chosen ? (
        <TemplateForm
          template={chosen}
          lessons={found.lessons}
          contactName={null}
          onBack={unpick}
          onSend={first.sendTemplate}
        />
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
          {offers ? <Note>{t.inbox.newChat.firstTemplate}</Note> : null}
          <TemplateList templates={templates} teacher={false} onPick={setChosen} />
        </View>
      )}
    </>
  );
}
