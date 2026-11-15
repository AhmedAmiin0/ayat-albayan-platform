import { Modal, Pressable, View } from 'react-native';
import { AppText, shape, t, type, useTheme } from '@ab/mobile-kit';
import { COUNTRIES, type Country } from '@ab/client-core';
import { CountryRow } from './CountryRow';

interface CountryPickerProps {
  open: boolean;
  current: Country;
  onPick: (country: Country) => void;
  onClose: () => void;
}

/** «اختر الدولة»: a sheet of the academy's countries (flag, name, calling code). */
export function CountryPicker({ open, current, onPick, onClose }: CountryPickerProps) {
  const { color } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: color.scrim }}
      />
      <View
        style={{
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
        <View accessibilityRole="radiogroup">
          {COUNTRIES.map((c) => (
            <CountryRow key={c.code} country={c} picked={c.code === current.code} onPick={onPick} />
          ))}
        </View>
      </View>
    </Modal>
  );
}
