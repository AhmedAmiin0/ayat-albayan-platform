import { View } from 'react-native';
import { t, AppText } from '@ab/mobile-kit';
import { ContactIsSelfPills } from '@/student-file/components/ContactIsSelfPills';
import type { ContactIsSelfCardProps } from './ContactIsSelfCard.types';
import { useContactIsSelfCard } from './use-contact-is-self-card';

export function ContactIsSelfCard(props: ContactIsSelfCardProps) {
  const { shown, saving, failed, pick, text } = useContactIsSelfCard(props);
  return (
    <View style={{ gap: 6 }}>
      <AppText style={text.label}>{t.familyAuth.contactIsSelf.label}</AppText>
      <ContactIsSelfPills value={shown} onChange={pick} disabled={saving} />
      <AppText style={text.hint}>{t.familyAuth.contactIsSelf.hint}</AppText>
      {failed ? (
        <AppText accessibilityRole="alert" style={text.alert}>{t.common.error}</AppText>
      ) : null}
    </View>
  );
}
