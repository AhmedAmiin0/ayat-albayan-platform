import { listedCount } from '@ab/client-core';
import { SHORT_LINK_AUDIENCES, type ShortLinkAudience } from '@ab/shared';
import { useId } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { errorText } from '@/features/platform/short-links/shared/link-errors';
import { ExpiryField } from './ExpiryField';
import { MaxUsersField } from './MaxUsersField';
import { useLinkForm, type LinkFormState } from './use-link-form';
import { UsersPanel } from './UsersPanel';
import { WhatsappSwitch } from './WhatsappSwitch';

const F = t.shortLinks.form;
const AUDIENCES = SHORT_LINK_AUDIENCES.map((value) => ({
  value,
  label: t.shortLinks.audience[value],
}));

interface CreateLinkDialogProps {
  onClose: () => void;
  /** The new link's code: its page opens. */
  onCreated: (code: string) => void;
}

function TextFields({ state }: { state: LinkFormState }) {
  const { form, patch, errors } = state;
  return (
    <>
      <Field label={F.titleLabel} hint={F.titleHint} error={errorText(errors, 'title')} required>
        {(c) => (
          <Input {...c} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        )}
      </Field>
      <Field label={F.target} hint={F.targetHint} error={errorText(errors, 'targetUrl')} required>
        {(c) => (
          <Input
            {...c}
            type="url"
            dir="ltr"
            inputMode="url"
            placeholder="https://"
            value={form.targetUrl}
            onChange={(e) => patch({ targetUrl: e.target.value })}
          />
        )}
      </Field>
    </>
  );
}

function AccessFields({ state }: { state: LinkFormState }) {
  const { form, patch, errors } = state;
  const listed = listedCount(form);
  const showUsers = form.audience === 'listed' || form.sendWhatsapp;
  return (
    <>
      <ExpiryField
        expiry={form.expiry}
        onChange={(expiry) => patch({ expiry })}
        error={errorText(errors, 'expiresAt')}
      />
      <MaxUsersField
        value={form.maxUsers}
        onChange={(maxUsers) => patch({ maxUsers })}
        listed={form.audience === 'listed' ? listed : 0}
        error={errorText(errors, 'maxUsers')}
      />
      <RadioChips<ShortLinkAudience>
        name="audience"
        legend={F.audience}
        options={AUDIENCES}
        value={form.audience}
        onChange={(audience) => patch({ audience })}
      />
      {showUsers && <UsersPanel users={form} onChange={patch} errors={errors} />}
      <WhatsappSwitch
        checked={form.sendWhatsapp}
        onChange={(sendWhatsapp) => patch({ sendWhatsapp })}
        listed={listed}
      />
    </>
  );
}

export function CreateLinkDialog({ onClose, onCreated }: CreateLinkDialogProps) {
  const formId = useId();
  const state = useLinkForm(onCreated);
  const formError = errorText(state.errors, 'form');
  const label = state.form.sendWhatsapp ? F.createAndSend : F.create;
  const actions = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>{F.cancel}</Button>
      <Button type="submit" form={formId} disabled={state.pending}>
        <Icon name={state.form.sendWhatsapp ? 'send' : 'plus'} />
        {state.pending ? F.creating : label}
      </Button>
    </>
  );
  return (
    <Dialog title={F.title} description={F.intro} onClose={onClose} actions={actions}>
      <form
        id={formId}
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          state.submit(e.currentTarget);
        }}
      >
        <TextFields state={state} />
        <AccessFields state={state} />
        {formError && <FormAlert>{formError}</FormAlert>}
      </form>
    </Dialog>
  );
}
