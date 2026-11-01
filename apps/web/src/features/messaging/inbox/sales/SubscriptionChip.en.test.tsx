import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pupil } from '@/features/messaging/inbox/testing/inbox-fixture';
import { SubscribePanel } from './SubscribePanel';
import { SubscriptionChip } from './SubscriptionChip';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

// The chat's subscription in English (LTR): the same chips and buttons, en.json words.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

describe('subscription in the chat, English', () => {
  it('each badge is an en.json word with its nuqta tone', () => {
    render(
      <>
        <SubscriptionChip badge="subscribed" />
        <SubscriptionChip badge="expired" />
        <SubscriptionChip badge="none" size="sm" />
      </>,
    );
    const toneOf = (text: string) => screen.getByText(text).closest('[data-tone]')?.getAttribute('data-tone');
    expect(toneOf('Subscribed')).toBe('ok');
    expect(toneOf('Package finished')).toBe('act');
    expect(toneOf('Not subscribed')).toBe('neutral');
  });

  it('the panel: the package line in English and one button per child', () => {
    const ended = pupil({ id: 's-2', name: 'Joud', code: 'AB-0184' }, { status: 'expired', lessons_used: 8, lessons_remaining: 0, due_amount: 0 });
    renderWithClient(
      <SubscribePanel people={{ guardian: { id: 'g-1', name: 'Umm Suhaila' }, lead: null, students: [pupil({ name: 'Suhaila' }), ended] }} />,
    );
    expect(screen.getByRole('complementary', { name: 'Subscription' })).toBeTruthy();
    expect(screen.getByText(`${en.enums.packageSize['8']} — ${en.subscriptions.progress.left.few.replace('{n}', '3')}`)).toBeTruthy();
    expect(screen.getByText(/^Owes 290 /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New subscription — Suhaila' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Renew subscription — Joud' })).toBeTruthy();
  });
});
