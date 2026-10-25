import { render, screen } from '@testing-library/react-native';
import { huda } from '@/inbox/shared/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { ContactStep } from './ContactStep';
import { draftFromLead } from './draft';

const step = (source?: 'other') =>
  render(
    <ContactStep
      value={{ ...draftFromLead(huda), ...(source ? { source } : {}) }}
      withDuration
      onChange={jest.fn()}
      onNext={jest.fn()}
    />,
  );

test('required questions carry «*» (name, WhatsApp number, parent); the optional ones do not', async () => {
  await step();
  for (const label of [t.leads.studentName, t.guardians.phone, t.guardians.name]) {
    expect(screen.getByText(`${label} *`)).toBeTruthy();
    expect(screen.getByLabelText(label).props.accessibilityHint).toBeTruthy();
  }
  expect(screen.getByText(t.leads.studentAge)).toBeTruthy();
  expect(screen.getByText(t.guardians.source)).toBeTruthy();
});

test('the registration form’s order: name, number, parent, age, gender, length, source', async () => {
  await step();
  const tree = JSON.stringify(screen.toJSON());
  const order = [
    `${t.leads.studentName} *`,
    `${t.guardians.phone} *`,
    `${t.guardians.name} *`,
    t.leads.studentAge,
    t.students.gender,
    t.booking.pickDuration,
    t.guardians.source,
  ].map((text) => tree.indexOf(text));
  expect(order.every((i) => i >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test('«كيف عرفت عنا؟» offers the form’s four answers; «أخرى» only when the lead already has it', async () => {
  const { unmount } = await step();
  for (const s of ['facebook_ad', 'instagram_ad', 'whatsapp_direct', 'referral'] as const) {
    expect(screen.getByRole('radio', { name: t.enums.leadSource[s] })).toBeTruthy();
  }
  expect(screen.queryByRole('radio', { name: t.enums.leadSource.other })).toBeNull();
  await unmount();
  await step('other');
  expect(screen.getByRole('radio', { name: t.enums.leadSource.other, checked: true })).toBeTruthy();
});
