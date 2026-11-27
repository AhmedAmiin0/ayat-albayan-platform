import { FlatList } from 'react-native';
import { EmptyState, t } from '@ab/mobile-kit';
import { CountryRow } from '@/sign-in/phone/CountryRow';
import type { CountryListProps } from './CountryList.types';

/** The picker's rows, virtualised (some 250 countries); a search that finds none says so. */
export function CountryList({ countries, current, onPick }: CountryListProps) {
  return (
    <FlatList
      accessibilityRole="radiogroup"
      data={countries}
      keyExtractor={(c) => c.code}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <CountryRow country={item} picked={item.code === current.code} onPick={onPick} />
      )}
      ListEmptyComponent={<EmptyState title={t.familyApp.signIn.countryNone} />}
      style={{ flex: 1 }}
    />
  );
}
