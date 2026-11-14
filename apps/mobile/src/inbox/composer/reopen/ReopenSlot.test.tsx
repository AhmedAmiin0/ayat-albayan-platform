import type { TemplateView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { plainReminder, thread } from '@/inbox/shared/thread-fixtures';
import { ReopenSlot } from './ReopenSlot';

// «إعادة فتح المحادثة» (owner 2026-11-14): the button opens the sheet on the academy's template,
// prefilled and editable, and the send is marked as the reopen. Fakes only: nothing is sent.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const chat = (key: string, over: Partial<TemplateView> = {}): TemplateView => ({
  ...plainReminder, key, meta_name: key, line: 'chat', sales_starter: true, ...over,
});
const INVITE = chat('free_trial_invite', { body_ar: 'أهلًا {{1}}', params: ['contact_name'] });
const WELCOME = chat('welcome_greeting', { body_ar: 'أهلًا بكم', params: [] });
const CLOSED = { ...thread, session_open: false, reopen_template: 'free_trial_invite' };
const onSend = jest.fn();
const names: Record<string, string> = t.templates.names;

async function show(rows: TemplateView[]) {
  mockApiFetch.mockResolvedValue(rows);
  const props = { phone: thread.phone_e164, lessons: [], teacher: false, open: false, held: true };
  const slot = <ReopenSlot {...props} thread={CLOSED} onSend={onSend} />;
  await renderWithQuery(slot, createTestQueryClient());
}

beforeEach(() => {
  mockApiFetch.mockReset();
  onSend.mockReset();
});

test('the button opens the preselected template, its name prefilled and editable', async () => {
  await show([plainReminder, WELCOME, INVITE]);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.reopenBar.action }));
  expect(await screen.findByText(names.free_trial_invite ?? INVITE.key)).toBeTruthy();
  const field = screen.getByLabelText(t.inbox.composer.paramNames.contact_name);
  expect(field.props.value).toBe(thread.display_name);
  await fireEvent.changeText(field, 'أم سارة');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'template', key: 'free_trial_invite', reopen: true }),
  );
  expect(onSend.mock.calls[0]?.[0].params).toEqual({ 1: 'أم سارة' });
});

test('back to the list: chat-line templates only', async () => {
  await show([plainReminder, WELCOME, INVITE]);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.reopenBar.action }));
  await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
  expect(await screen.findByText(names.welcome_greeting ?? WELCOME.key)).toBeTruthy();
  expect(screen.queryByText(names.lesson_reminder_plain ?? plainReminder.key)).toBeNull();
});

test('no template allowed: the help line and no button', async () => {
  await show([]);
  expect(await screen.findByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.reopenBar.action })).toBeNull();
});

test('templates, none on the chat line: why, and no button', async () => {
  await show([plainReminder]);
  expect(await screen.findByText(t.inbox.reopenBar.closed)).toBeTruthy();
  // The button waits for the list: gone once it loads with nothing on the chat line.
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: t.inbox.reopenBar.action })).toBeNull(),
  );
});
