import { FEEDBACK_MODES, type AcademySettings, type FeedbackMode } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { FormAlert } from '@/components/ui/form-alert';
import { RadioChips } from '@/components/ui/radio-chips';
import { t } from '@/lib/i18n';
import { updateSettings } from './api';

const s = t.templates.settings;
const LABEL: Record<FeedbackMode, string> = { buttons: s.feedbackModeButtons, link: s.feedbackModeLink };

/**
 * settings.feedback_mode (migration 195): after a lesson took place, the guardian gets the
 * lesson_rating buttons (a tap reopens the chat), or nothing automatic (the admin sends the form
 * link by hand). Saved at once with PATCH /settings { feedbackMode }, like the switches above.
 */
export function FeedbackModeSwitch({ settings }: { settings: AcademySettings }) {
  const queryClient = useQueryClient();
  const name = useId();
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => queryClient.setQueryData(['settings'], next),
  });
  const mode = settings.feedback_mode;
  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <RadioChips<FeedbackMode>
        name={name}
        legend={s.feedbackMode}
        options={FEEDBACK_MODES.map((value) => ({ value, label: LABEL[value] }))}
        value={mode}
        disabled={save.isPending}
        onChange={(feedbackMode) => save.mutate({ feedbackMode })}
      />
      <p className="text-xs text-ink-3">{mode === 'buttons' ? s.feedbackButtonsHint : s.feedbackLinkOnly}</p>
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
    </div>
  );
}
