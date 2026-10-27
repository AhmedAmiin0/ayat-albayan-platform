import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fromOption, fromPhone } from './invitee-draft';
import { InviteeChips } from './InviteeChips';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: a phone chip reads as one LTR island, an Arabic name as itself; the key stays E.164', async () => {
  const phone = fromPhone('+20 100 000 0101');
  if (!phone) throw new Error('fixture');
  const staff = fromOption({ kind: 'staff', id: 's1', name: 'أبرار', role: 'teacher' });
  const onRemove = jest.fn();
  await render(<InviteeChips list={[staff, phone]} onRemove={onRemove} />);
  expect(screen.getByText('أبرار')).toBeTruthy();
  expect(phone.label.startsWith('⁦') && phone.label.endsWith('⁩')).toBe(true);
  expect(screen.getByText(phone.label)).toBeTruthy();
  expect(phone.input).toEqual({ kind: 'phone', phone: '+201000000101' });
  await fireEvent.press(screen.getByRole('button', { name: t.meetingInvites.removeInvitee.replace('{name}', phone.label) }));
  expect(onRemove).toHaveBeenCalledWith('phone:+201000000101');
});
