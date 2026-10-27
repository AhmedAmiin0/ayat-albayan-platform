import { fireEvent, render, screen } from '@testing-library/react-native';
import { bookingRequestSchema } from '@ab/shared';
import { huda } from '@/inbox/shared/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { ContactStep } from './ContactStep';
import { draftFromLead } from '../lib/draft';
import { toBookingRequest } from '../lib/booking-body';
import { draft } from '../../testing/fixtures';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1, a docs/13 deviation) on step 1.

const C = t.familyAuth.contactIsSelf;
const REQ = '99999999-9999-4999-8999-999999999999';

test('defaults to «ولي الأمر»; tapping «الطالب نفسه» patches contactIsSelf', async () => {
  const onChange = jest.fn();
  await render(<ContactStep value={draftFromLead(huda)} withDuration onChange={onChange} onNext={jest.fn()} />);
  expect(screen.getByText(C.label)).toBeTruthy();
  expect(screen.getByRole('radio', { name: C.guardian }).props.accessibilityState).toMatchObject({ checked: true });
  fireEvent.press(screen.getByRole('radio', { name: C.self }));
  expect(onChange).toHaveBeenCalledWith({ contactIsSelf: true });
});

test('POST /booking sends contact_is_self only for «الطالب نفسه»', () => {
  const self = toBookingRequest(draft({ contactIsSelf: true }), { requestId: REQ });
  expect(self).toMatchObject({ newStudent: { contact_is_self: true } });
  expect(bookingRequestSchema.safeParse(self).success).toBe(true);
  const guardian = toBookingRequest(draft(), { requestId: REQ });
  expect(guardian && 'newStudent' in guardian ? guardian.newStudent : null).not.toHaveProperty('contact_is_self');
});
