import { render, screen } from '@testing-library/react-native';
import { ltr } from '@ab/mobile-kit';
import type { Country } from './countries';
import { CountryButton } from './CountryButton';

const saudi: Country = { code: 'SA', dial: '+966', digits: 9, flag: '🇸🇦' };

// Owner 2026-11-17: in Arabic the field showed «966+». A calling code has no strong letter, so on
// Android an RTL line prints the «+» last unless the code sits in an LTR isolate (kit Ltr).
it('prints the calling code as an LTR island, never bare', async () => {
  await render(<CountryButton country={saudi} onPress={jest.fn()} />);
  expect(screen.getByText(ltr(saudi.dial))).toBeTruthy();
  expect(screen.queryByText(saudi.dial)).toBeNull();
});
