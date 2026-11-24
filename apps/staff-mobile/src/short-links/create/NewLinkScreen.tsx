import { listedCount, type LinkField, type LinkForm } from '@ab/client-core';
import { counted } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import {
  t,
  Button,
  ButtonRow,
  ErrorLine,
  InsetGroup,
  Note,
  Screen,
  ScreenHeader,
  Section,
  SwitchRow,
} from '@ab/mobile-kit';
import { ExpiryField } from '@/short-links/ui/ExpiryField';
import { FormField } from '@/short-links/ui/FormField';
import { errorText } from '@/short-links/ui/link-words';
import { MaxUsersField } from '@/short-links/ui/MaxUsersField';
import { backToList, linkHref } from '@/short-links/ui/routes';
import { AudienceField } from './AudienceField';
import { useLinkForm, type LinkFormState } from './use-link-form';

const F = () => t.shortLinks.form;

function SendField({ form, set }: Pick<LinkFormState, 'form' | 'set'>) {
  const n = listedCount(form);
  return (
    <InsetGroup>
      <SwitchRow
        label={F().sendWhatsapp}
        value={form.sendWhatsapp}
        onChange={(sendWhatsapp) => set({ sendWhatsapp })}
      >
        <Note>{F().sendWhatsappHint}</Note>
        {form.sendWhatsapp && n > 0 ? <Note>{counted(F().sendTo, n)}</Note> : null}
      </SwitchRow>
    </InsetGroup>
  );
}

/** A host off the allow-list answers target_not_allowed. */
function BasicFields({ form, set, errors }: Pick<LinkFormState, 'form' | 'set' | 'errors'>) {
  return (
    <>
      <FormField
        label={F().titleLabel}
        value={form.title}
        onChangeText={(title) => set({ title })}
        hint={F().titleHint}
        error={errorText(errors, 'title')}
      />
      <FormField
        label={F().target}
        ltr
        autoCapitalize="none"
        keyboardType="url"
        value={form.targetUrl}
        onChangeText={(targetUrl) => set({ targetUrl })}
        hint={F().targetHint}
        error={errorText(errors, 'targetUrl')}
      />
    </>
  );
}

const createLabel = (form: LinkForm): string =>
  form.sendWhatsapp ? F().createAndSend : F().create;

/** New short link (docs/19); the API's allow-list answers target_not_allowed. */
export function NewLinkScreen({ base }: { base: string }) {
  const { form, set, errors, submit, busy } = useLinkForm((code) =>
    router.replace(linkHref(base, code)),
  );
  const err = (field: LinkField) => errorText(errors, field);
  const formError = err('form');
  return (
    <Screen scroll>
      <ScreenHeader
        title={F().title}
        subtitle={F().intro}
        trailing={<Button variant="ghost" label={F().close} onPress={() => backToList(base)} />}
      />
      <BasicFields form={form} set={set} errors={errors} />
      <Section title={F().expiry}>
        <ExpiryField
          expiry={form.expiry}
          onChange={(expiry) => set({ expiry })}
          error={err('expiresAt')}
        />
      </Section>
      <MaxUsersField
        value={form.maxUsers}
        onChange={(maxUsers) => set({ maxUsers })}
        error={err('maxUsers')}
      />
      <Section title={F().audience}>
        <AudienceField form={form} set={set} error={err('people') ?? err('phones')} />
      </Section>
      <SendField form={form} set={set} />
      <View style={{ gap: 8 }}>
        {formError ? <ErrorLine message={formError} /> : null}
        <ButtonRow>
          <Button label={busy ? F().creating : createLabel(form)} onPress={submit} busy={busy} />
          <Button variant="secondary" label={F().cancel} onPress={() => backToList(base)} />
        </ButtonRow>
      </View>
    </Screen>
  );
}
