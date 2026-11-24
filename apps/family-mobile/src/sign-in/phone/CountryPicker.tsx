import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AppText, locale, shape, t, type, useTheme } from '@ab/mobile-kit';
import { type Country, orderCountries, searchCountries } from '@ab/client-core';
import { phoneRegion } from './countries';
import { CountryList } from './CountryList';
import { CountrySearch } from './CountrySearch';

interface CountryPickerProps {
  open: boolean;
  current: Country;
  onPick: (country: Country) => void;
  onClose: () => void;
}

/** The phone's own and the academy's usual countries first; searchable; virtualised. */
export function CountryPicker({ open, current, onPick, onClose }: CountryPickerProps) {
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const shown = searchCountries(orderCountries(phoneRegion(), locale), query);
  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (country: Country) => {
    setQuery('');
    onPick(country);
  };
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
