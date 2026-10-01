import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import Inbox from '../../app/(tabs)/inbox/index';
import Students from '../../app/(tabs)/students/index';

// Placeholders until the builders fill the tabs: a title and an honest empty state, nothing fake.
// «المزيد» is real now: src/more/MoreScreen.test.tsx (logout included).
test.each([
  ['inbox', Inbox, t.nav.leads],
  ['students', Students, t.nav.students],
])('%s tab: Amiri title and empty state', async (_name, Tab, title) => {
  await render(<Tab />);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByRole('header', { name: t.common.empty })).toBeTruthy();
});
