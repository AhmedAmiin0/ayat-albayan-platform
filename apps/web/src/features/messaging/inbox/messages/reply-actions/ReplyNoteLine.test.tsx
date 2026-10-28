import { pathKey } from '@ab/client-core';
import type { Permission, ThreadLesson } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '../../testing/inbox-fixture';
import { routeFetch } from '../../testing/test-utils';
import { InboxModeContext, type InboxMode } from '../../shared/mode';
import { ReplyActionsProvider, ReplyNoteLine } from './index';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
// The admin's form is its own feature's (RescheduleForm tests): here only that it opens on the right lesson.
vi.mock('@/features/teaching/schedule', async (orig) => ({
  ...(await orig<object>()),
  RescheduleForm: ({ lesson, onDone }: { lesson: { id: string }; onDone: (m: string) => void }) => (
    <button type="button" onClick={() => onDone('moved')}>{`form ${lesson.id}`}</button>
  ),
}));

const NO = 'لم تتأكد أي حلقة بهذا الرد';
const LESSON: ThreadLesson = {
  id: 'l-1',
  starts_at: '2099-10-04T14:00:00Z',
  ends_at: '2099-10-04T15:00:00Z',
  status: 'scheduled',
  meeting_link: null,
  student_names: ['ياسين'],
  tz: 'Asia/Riyadh',
};
const ASK = message({ id: 'm-r', body: 'تأجيل الحلقة إلى غدا', guardian_id: 'g-1', lead_id: null });
const YES = message({ id: 'm-y', body: 'ايوة', guardian_id: 'g-1', lead_id: null });
const ADMIN: Permission[] = ['lessons.reschedule', 'lessons.write', 'lessons.read', 'booking.write', 'lessons.status'];

function renderNote(m: typeof ASK, opts: { mode: InboxMode; permissions: Permission[]; lessons?: ThreadLesson[] }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(pathKey('/auth/me'), { id: 'u', email: null, role: 'admin', permissions: opts.permissions });
  render(
    <QueryClientProvider client={client}>
      <InboxModeContext.Provider value={opts.mode}>
        <ReplyActionsProvider phone={m.phone_e164} lessons={opts.lessons ?? [LESSON]}>
          <ReplyNoteLine message={m} />
        </ReplyActionsProvider>
      </InboxModeContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('reply note actions (owner 2026-10-28)', () => {
  it('«تأجيل الحلقة»: «تغيير الموعد» opens the admin form on the family’s next lesson; once moved the note says so', async () => {
    routeFetch(apiFetch, [['/lessons?', [{ id: 'l-1', students: [] }]]]);
    renderNote(ASK, { mode: 'admin', permissions: ADMIN });
    expect(screen.getByText(t.inbox.quickReply.reschedule)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^تغيير موعد حلقة/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'form l-1' }));
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/lessons?from=2099-10-04T14%3A00%3A00.000Z&to=2099-10-04T14%3A01%3A00.000Z');
    expect(await screen.findByText(t.inbox.quickReply.rescheduled)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^تغيير موعد حلقة/ })).toBeNull();
  });

  it('no right to move, no lesson, or sales on the web: «طلب تغيير الموعد» and no button', () => {
    renderNote(ASK, { mode: 'admin', permissions: ['lessons.status'] });
    renderNote(ASK, { mode: 'admin', permissions: ADMIN, lessons: [] });
    renderNote(ASK, { mode: 'sales', permissions: ['self.sales', 'self.sales_academy', 'lessons.reschedule'] });
    expect(screen.getAllByText(t.inbox.quickReply.rescheduleNoLesson)).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('«ايوة»: «تأكيد الحلقة» by sales’ route, then the chat re-reads; never «no lesson was confirmed»', async () => {
    apiSend.mockResolvedValue({ id: 'l-1', status: 'confirmed' });
    renderNote(YES, { mode: 'sales', permissions: ['lessons.confirm'] });
    expect(screen.queryByText(NO)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^تأكيد حلقة/ }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-1/confirm'));
  });

  it('«ايوة» without the right to confirm: no button and no «not confirmed»; a confirmed lesson: «تم تأكيد حلقة …»', () => {
    renderNote(YES, { mode: 'admin', permissions: ['lessons.reschedule'] });
    renderNote(YES, { mode: 'teacher', permissions: ['lessons.status', 'lessons.confirm'] });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(NO)).toBeNull();
    renderNote(YES, { mode: 'admin', permissions: [], lessons: [{ ...LESSON, status: 'confirmed' }] });
    expect(screen.getByText(/^تم تأكيد حلقة/)).toBeTruthy();
  });
});
