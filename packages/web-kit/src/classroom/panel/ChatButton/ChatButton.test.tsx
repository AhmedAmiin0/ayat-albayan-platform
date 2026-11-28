import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChatButton } from './ChatButton';

const word = t.mobileRoom.controls.chat;
const unreadName = (n: number) => t.portal.app.child.chatUnread.replace('{n}', String(n));

describe('ChatButton', () => {
  it('names its unread count and shows it as a badge', () => {
    render(<ChatButton unread={4} on={false} round={false} onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: unreadName(4) });
    expect(button.textContent).toContain('4');
  });

  it('is just the chat word with no badge when nothing is unread', () => {
    render(<ChatButton unread={0} on round onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: word });
    expect(button.querySelector('[aria-hidden="true"].tabular-nums')).toBeNull();
  });

  it('calls back on a press', () => {
    const onClick = vi.fn();
    render(<ChatButton unread={1} on={false} round={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: unreadName(1) }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
