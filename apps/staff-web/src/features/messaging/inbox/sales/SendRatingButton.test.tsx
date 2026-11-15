import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE, template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { clearOwnSends, lastOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { SendRatingButton } from './SendRatingButton';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearOwnSends();
});

describe('«إرسال تقييم الحلقة» counts as her own send (round 2 I)', () => {
  it('a sent rating is recorded, so the log follows it when the row arrives', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [template({ key: 'lesson_rating', params: ['student_name', 'lesson_date'] })]]]);
    apiSend.mockResolvedValue(message({ id: 'm-rating', direction: 'outbound', status: 'sent', template_key: 'lesson_rating' }));
    renderWithClient(
      <InboxModeContext.Provider value="admin">
        <SendRatingButton thread={{ phone_e164: PHONE, guardian_id: 'g-1' }} />
      </InboxModeContext.Provider>,
    );
    const button = screen.getByRole<HTMLButtonElement>('button', { name: t.inbox.rating.send });
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(lastOwnSend(PHONE)).toBeUndefined();
    fireEvent.click(button);
    expect(await screen.findByText(t.inbox.rating.sent)).toBeTruthy();
    expect(lastOwnSend(PHONE)).toBe('m-rating');
  });
});
