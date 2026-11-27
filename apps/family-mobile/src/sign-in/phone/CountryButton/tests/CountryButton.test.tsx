import { render, screen } from '@testing-library/react-native';
import { ltr } from '@ab/mobile-kit';
import { defaultCountry } from '@/sign-in/phone/countries';
import { CountryButton } from '@/sign-in/phone/CountryButton';

const saudi = defaultCountry('SA');

// In Arabic the field showed «966+». A calling code has no strong letter, so on
// Android an RTL line prints the «+» last unless the code sits in an LTR isolate (kit Ltr).
it('prints the calling code as an LTR island, never bare', async () => {
  await render(<CountryButton country={saudi} onPress={jest.fn()} />);
  expect(screen.getByText(ltr(saudi.dial))).toBeTruthy();
  expect(screen.queryByText(saudi.dial)).toBeNull();
});
