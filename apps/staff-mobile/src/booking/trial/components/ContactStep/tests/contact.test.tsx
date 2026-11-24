import { fireEvent, render, screen } from '@testing-library/react-native';
import { bookingRequestSchema } from '@ab/shared';
import { huda } from '@/inbox/shared/fixtures';
import { t } from '@ab/mobile-kit';
import { ContactStep } from '@/booking/trial/components/ContactStep/ContactStep';
import { draftFromLead } from '@/booking/trial/lib/draft';
import { toBookingRequest } from '@/booking/trial/lib/booking-body';
import { draft } from '@/booking/testing/fixtures';

// docs/30 §1 deviation from docs/13: whose WhatsApp number it is, on step 1.

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
