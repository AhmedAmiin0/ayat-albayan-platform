import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { WebPushState } from '@ab/web-kit/push/use-web-push';
import { PushRow } from './PushRow';

const push = vi.hoisted(() => ({ current: {} as WebPushState }));
vi.mock('@ab/web-kit/push/use-web-push', () => ({ useWebPush: () => push.current }));

const state = (over: Partial<WebPushState>): WebPushState => ({
  view: 'off', busy: false, failed: false, enable: vi.fn(), disable: vi.fn(), ...over,
});

beforeEach(() => {
  push.current = state({});
});

describe('PushRow: «إشعارات المتصفح» as a family settings row', () => {
  it('off: an unchecked switch named by the row title that enables', () => {
    render(<PushRow hint="hint" />);
    const toggle = screen.getByRole('switch', { name: t.bell.push.title });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('hint')).toBeTruthy();
    expect(screen.getByText(t.bell.push.off)).toBeTruthy();
    fireEvent.click(toggle);
    expect(push.current.enable).toHaveBeenCalledOnce();
  });

  it('on: checked, says so, and disables', () => {
    push.current = state({ view: 'on' });
    render(<PushRow hint="hint" />);
    const toggle = screen.getByRole('switch', { name: t.bell.push.title });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(t.bell.push.on)).toBeTruthy();
    fireEvent.click(toggle);
    expect(push.current.disable).toHaveBeenCalledOnce();
  });

  it('a state that cannot toggle only explains; a failed change alerts', () => {
    push.current = state({ view: 'denied', failed: true });
    render(<PushRow hint="hint" />);
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText(t.bell.push.denied)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(t.bell.push.failed);
  });

  it('busy: the switch waits', () => {
    push.current = state({ busy: true });
    render(<PushRow hint="hint" />);
    expect(screen.getByRole('switch').hasAttribute('disabled')).toBe(true);
  });
});
