import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { thread } from './inbox-fixture';
import { ReplyFromNote } from './ReplyFromNote';

const lang = vi.hoisted(() => ({ en: false }));
vi.mock('@/lib/i18n/i18n', async (orig) => {
  const real = await orig<{ t: object }>();
  return {
    ...real,
    get t() {
      return lang.en ? en : real.t;
    },
  };
});

afterEach(() => {
  lang.en = false;
});

describe('ReplyFromNote', () => {
  it('an open chat window says the reply leaves from the chat line', async () => {
    const { t } = await import('@/lib/i18n/i18n');
    render(<ReplyFromNote thread={thread({ session_open: true, reply_line: 'chat' })} />);
    expect(screen.getByText(t.inbox.line.replyFrom.replace('{line}', t.enums.waLine.chat)).tagName).toBe('P');
  });

  it('nothing for a closed window or an unknown line', () => {
    const { container } = render(
      <>
        <ReplyFromNote thread={thread({ session_open: false, reply_line: 'chat' })} />
        <ReplyFromNote thread={thread({ session_open: true, reply_line: null })} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('in English', () => {
    lang.en = true;
    render(<ReplyFromNote thread={thread({ session_open: true, reply_line: 'notifications' })} />);
    expect(screen.getByText('Your reply will be sent via: Notifications line')).toBeTruthy();
  });
});
