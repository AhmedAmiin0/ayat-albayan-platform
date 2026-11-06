import type { NumberEvolutionView, NumberView } from '@ab/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { evolutionErrorText } from '@/features/messaging/numbers/evolution/sync/evolution-sync-api';
import { EvolutionSyncLine } from '@/features/messaging/numbers/evolution/sync/EvolutionSyncLine';
import { BehaviourSection } from './BehaviourSection';
import { CloudSection } from './CloudSection';
import { ProxySection } from './ProxySection';
import { LimitsSection, SendingSection } from './SendingSection';
import { useConfigForm } from './use-config-form';
import { WebhookSection } from './WebhookSection';

const c = t.numbers.evolution.config;

export interface EvolutionConfigDialogProps {
  view: NumberView;
  evolution: NumberEvolutionView;
  onClose: () => void;
}

/**
 * «إعدادات Evolution» (docs/19 «Evolution driver»): every option of the instance, checked with
 * evolutionConfigSchema, saved with PUT …/evolution/config; the answer (each part read back from
 * Evolution) stays shown. The Cloud section shows only on a Cloud instance.
 */
export function EvolutionConfigDialog({ view, evolution, onClose }: EvolutionConfigDialogProps) {
  const formId = useId();
  const form = useConfigForm(view, evolution);
  const { draft, errors, set, save } = form;
  return (
    <Dialog
      title={c.title}
      description={c.intro}
      onClose={onClose}
      wide
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>{t.common.close}</Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? c.saving : c.save}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={form.submit} className="grid gap-4">
        {Object.keys(errors).length > 0 && <FormAlert>{c.invalid}</FormAlert>}
        {save.isError && <FormAlert>{evolutionErrorText(save.error)}</FormAlert>}
        {form.answer && <EvolutionSyncLine sync={form.answer} />}
        <BehaviourSection value={draft.behaviour} errors={errors} onChange={set('behaviour')} />
        <WebhookSection
          value={draft.webhook}
          errors={errors}
          onChange={set('webhook')}
          hookUrl={evolution.hook_url}
        />
        <ProxySection value={draft.proxy} errors={errors} onChange={set('proxy')} view={view} />
        <SendingSection value={draft.sending} errors={errors} onChange={set('sending')} />
        <LimitsSection value={draft.limits} errors={errors} onChange={set('limits')} />
        {evolution.mode === 'cloud' && (
          <CloudSection value={draft.cloud} errors={errors} onChange={set('cloud')} view={view} />
        )}
      </form>
    </Dialog>
  );
}
