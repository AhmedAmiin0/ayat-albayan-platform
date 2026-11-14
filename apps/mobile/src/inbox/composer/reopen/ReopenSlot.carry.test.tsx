import type { TemplateView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { plainReminder, thread } from '@/inbox/shared/thread-fixtures';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { ReopenSlot } from './ReopenSlot';

// «أرسِل الآن داخل قالب» (owner 2026-11-14): the draft goes now inside academy_message, as the
// phone's reopen, and leaves the box. Fakes only: nothing is sent.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const BODY = 'السلام عليكم\nرسالة من الأكاديمية:\n\n{{1}}\n\nيسعدنا ردّكم.';
const chat = (key: string, over: Partial<TemplateView> = {}): TemplateView => ({
  ...plainReminder, key, meta_name: key, line: 'chat', sales_starter: true, ...over,
});
const ACADEMY = chat('academy_message', { body_ar: BODY, params: ['var_1'] });
const WELCOME = chat('welcome_greeting', { body_ar: 'أهلًا بكم', params: [] });
const CLOSED = { ...thread, session_open: false, reopen_template: 'welcome_greeting' };
const PHONE = thread.phone_e164;
const onSend = jest.fn();
const carry = () => screen.queryByRole('button', { name: t.inbox.reopenBar.carry });

async function show(rows: TemplateView[], draft = 'سطر أول\n\nسطر   ثانٍ') {
  setComposerText(PHONE, draft);
  mockApiFetch.mockResolvedValue(rows);
  const props = { phone: PHONE, lessons: [], teacher: false, open: false, held: true };
  const slot = <ReopenSlot {...props} thread={CLOSED} onSend={onSend} />;
  await renderWithQuery(slot, createTestQueryClient());
}

beforeEach(() => {
  mockApiFetch.mockReset();
  onSend.mockReset();
  setComposerText(PHONE, '');
});

test('approved and allowed, with a draft: the second action shows', async () => {
  await show([WELCOME, ACADEMY]);
  expect(await screen.findByRole('button', { name: t.inbox.reopenBar.carry })).toBeTruthy();
});

test('academy_message not on this user’s list: no second action', async () => {
  await show([WELCOME]);
  await screen.findByRole('button', { name: t.inbox.reopenBar.action });
  expect(carry()).toBeNull();
});

test('no draft: no second action', async () => {
  await show([WELCOME, ACADEMY], '  ');
  await screen.findByRole('button', { name: t.inbox.reopenBar.action });
  expect(carry()).toBeNull();
});

test('sends the draft normalised in academy_message; cleared once the API took it', async () => {
  await show([WELCOME, ACADEMY]);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.reopenBar.carry }));
  const box = await screen.findByLabelText(t.inbox.composer.freeText);
  expect(box.props.value).toBe('سطر أول\n\nسطر   ثانٍ');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'template', key: 'academy_message', reopen: true }),
    expect.any(Function),
  );
  expect(onSend.mock.calls[0]?.[0].params).toEqual({ 1: 'سطر أول · سطر ثانٍ' });
  // A refused send (409 reopen_live…) never calls `done`: the draft stays in the box.
  expect(getComposerText(PHONE)).toBe('سطر أول\n\nسطر   ثانٍ');
  const done = onSend.mock.calls[0]?.[1] as () => void;
  done();
  expect(getComposerText(PHONE)).toBe('');
});
