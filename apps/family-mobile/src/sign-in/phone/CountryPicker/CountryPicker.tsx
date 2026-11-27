import { Modal, Pressable, View } from 'react-native';
import { AppText, shape, t, type, useTheme } from '@ab/mobile-kit';
import { CountryList } from '@/sign-in/phone/CountryList';
import { CountrySearch } from '@/sign-in/phone/CountrySearch';
import type { CountryPickerProps } from './CountryPicker.types';
import { useCountryPicker } from './use-country-picker';

/** The phone's own and the academy's usual countries first; searchable; virtualised. */
export function CountryPicker({ open, current, onPick, onClose }: CountryPickerProps) {
  const { color } = useTheme();
  const { query, setQuery, shown, close, pick } = useCountryPicker({ onPick, onClose });
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={close}
        style={{ flex: 1, backgroundColor: color.scrim }}
      />
      <View
        style={{
          height: '80%',
          backgroundColor: color.page,
          borderTopStartRadius: shape.radius.lg * 2,
          borderTopEndRadius: shape.radius.lg * 2,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <AppText
          accessibilityRole="header"
          style={{
            paddingHorizontal: 20,
            paddingBottom: 8,
            fontFamily: type.ui[700],
            fontSize: type.size.lg,
            lineHeight: type.lineHeight(type.size.lg, true),
            color: color.ink,
          }}
        >
          {t.familyApp.signIn.countryTitle}
        </AppText>
        <CountrySearch query={query} onQuery={setQuery} />
        <CountryList countries={shown} current={current} onPick={pick} />
      </View>
    </Modal>
  );
}
