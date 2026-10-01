import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import More from '../../app/(tabs)/more/index';

// Placeholders until the builders fill the tabs: a title and an honest empty state, nothing fake.
test.each([
  ['more', More, t.mobile.more],
])('%s tab: Amiri title and empty state', async (_name, Tab, title) => {
  await render(<Tab />);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByRole('header', { name: t.common.empty })).toBeTruthy();
});

test('more: logout only signs out (the auth gate clears caches and shows /login)', async () => {
  await render(<More />);
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(supabase.auth.signOut).toHaveBeenCalled();
});
