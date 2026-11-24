import { clickToChatLink, formatPhone, secondPhoneOf } from '@ab/shared';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { inTree, useInChat, useTreeBase } from '@/core/nav/tree-base';
import { threadHref } from '@/inbox';
import { t, shape, type, useTheme, Button, Ltr, AppText } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { SecondPhone } from './SecondPhone';
import type { StudentProfile } from '@ab/shared';

/** One ButtonRow (docs/07 §6); WhatsApp is the screen's one filled button. */
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
      {/* Opened above a chat, the chat is one back away; a link would stack it twice. */}
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
