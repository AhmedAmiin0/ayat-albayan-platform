import { clickToChatLink, formatPhone, secondPhoneOf } from '@ab/shared';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { inTree, useInChat, useTreeBase } from '@/core/nav/tree-base';
import { threadHref } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import type { StudentProfile } from '@/students/shared/types';
import { SecondPhone } from './SecondPhone';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * ولي الأمر: name, LTR phone, then ONE ButtonRow (docs/07 §6 «الأزرار»): «اتصال» (tel:, outlined) |
 * «واتساب» (wa.me, the academy's channel: the screen's one filled button). Both on the main number; a family
 * with a second number (owner 2026-10-29) labels the two, the second under the buttons (SecondPhone).
 * The name opens the family's chat in the app (owner 2026-11-02, «العائلة» from the profile).
 */
export function GuardianCard({ guardian }: { guardian: StudentProfile['guardian'] }) {
  const { color } = useTheme();
  const phone = guardian.phone_e164;
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <SectionLabel>{t.students.guardian}</SectionLabel>
      {/* Opened above a chat, the chat is one «رجوع» away: a link would stack it twice. */}
      <GuardianName name={guardian.name} phone={useInChat() ? null : phone} />
      {secondPhoneOf(guardian.phones) ? <SectionLabel>{t.guardians.mainPhone}</SectionLabel> : null}
      <Ltr
        style={{
          alignSelf: 'flex-start',
          fontFamily: type.ui[500],
          fontSize: type.size.body,
          color: color.ink2,
        }}
      >
        {formatPhone(phone)}
      </Ltr>
      <ButtonRow>
        <Button variant="secondary" label={t.mobile.call} onPress={() => void Linking.openURL(`tel:${phone}`)} />
        <Button label={t.mobile.whatsapp} onPress={() => void Linking.openURL(clickToChatLink(phone))} />
      </ButtonRow>
      {guardian.phones ? <SecondPhone guardianId={guardian.id} phones={guardian.phones} /> : null}
    </View>
  );
}

/** The guardian's name, a link to the family's chat in the app (owner 2026-11-02, «العائلة»). */
function GuardianName({ name, phone }: { name: string; phone: string | null }) {
  const { color } = useTheme();
  const base = useTreeBase();
  const open = phone ? () => router.push(inTree(base, threadHref(phone))) : undefined;
  return (
    <Pressable
      accessibilityRole={open ? 'link' : undefined}
      accessibilityHint={open ? t.students.family.openChat : undefined}
      disabled={!open}
      onPress={open}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{ alignSelf: 'flex-start' }}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: open ? color.lapis : color.ink,
        }}
      >
        {name}
      </AppText>
    </Pressable>
  );
}
