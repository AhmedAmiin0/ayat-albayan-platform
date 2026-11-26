import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { channelPage, portalApi, type Answers, kid } from '@ab/web-kit/testing';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { ChildBody } from '@/features/children/ChildBody/ChildBody';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const ON = { settings: { family_chat_enabled: true } };
const C = t.studentChannel;
const chatName = (n: number) => t.portal.app.child.chatUnread.replace('{n}', String(n));

/** The portal's answers by route; the chat header's presence is off. */
function answer(answers: Answers) {
  const portal = portalApi(answers);
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/presence') ? { enabled: false, peers: [] } : portal(path),
  );
}

function show(tab?: 'chat') {
  const onTab = vi.fn();
  renderAt(<ChildBody student={kid()} kind="guardian" tab={tab} onTab={onTab} />);
  return onTab;
}

beforeEach(() => {
  apiFetch.mockReset();
  apiSend.mockClear();
});

describe('«المحادثة» on a child’s page (docs/51 §1a)', () => {
  it('while family_chat_enabled is on: the last tab, its unread count named with it', async () => {
    answer({ ...ON, unread: { unread: 2 } });
    const onTab = show();
    const tab = await screen.findByRole('tab', { name: chatName(2) });
    expect(tab.textContent).toContain('2');
    fireEvent.click(tab);
    expect(onTab).toHaveBeenCalledWith('chat');
  });

  it('no unread: the word only, no count', async () => {
    answer(ON);
    show();
    const tab = await screen.findByRole('tab', { name: t.portal.app.child.chat });
    expect(tab.textContent).toBe(t.portal.app.child.chat);
  });

  it('?tab=chat opens the student’s thread with the teacher', async () => {
    answer({ ...ON, messages: channelPage() });
    show('chat');
    expect(await screen.findByText('غدًا إن شاء الله')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages');
  });

  it('switch off: no tab, no channel read; ?tab=chat falls back to «القادمة»', async () => {
    answer({});
    show('chat');
    expect(await screen.findByRole('tab', { name: t.portal.upcomingTab })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: t.portal.app.child.chat })).toBeNull();
    const reads = apiFetch.mock.calls.map(([path]) => String(path));
    expect(reads.some((path) => path.includes('/channel/'))).toBe(false);
  });
});

describe('the chat panel’s states', () => {
  it('a refused read (403 family_chat_off) is the load error with «حاول مرة أخرى»', async () => {
    answer({ ...ON, messages: new Error('family_chat_off') });
    show('chat');
    expect(await screen.findByText(C.loadFailed, { exact: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: C.retry })).toBeTruthy();
  });

  it('an empty thread says so', async () => {
    answer({ ...ON, messages: channelPage({ messages: [] }) });
    show('chat');
    expect(await screen.findByText(C.empty)).toBeTruthy();
  });

  it('a closed channel shows why instead of the composer', async () => {
    const closed = channelPage({ open: false, closed_reason: 'no_teacher' });
    answer({ ...ON, messages: closed });
    show('chat');
    expect(await screen.findByText(C.closedReasons.no_teacher)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
