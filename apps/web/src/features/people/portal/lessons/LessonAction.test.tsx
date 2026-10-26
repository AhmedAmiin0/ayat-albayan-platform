import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LessonAction } from './LessonAction';
import { lesson } from '../portal.fixtures';
import { renderPortal } from '../portal.render';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const NOW_OPEN = new Date('2026-10-27T15:55:00.000Z');
const show = (over: Parameters<typeof lesson>[0], now = NOW_OPEN) =>
  renderPortal(<LessonAction lesson={lesson(over)} studentId="s1" tz="Africa/Cairo" now={now} />);

describe('LessonAction «ادخل الحلقة»', () => {
  afterEach(() => {
    apiSend.mockReset();
    vi.unstubAllGlobals();
  });

  it('a platform lesson inside the window asks for the student’s guest link and goes there', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    apiSend.mockResolvedValue({ url: 'https://app.example.org/join/tok', expires_at: 'x' });
    show({});
    fireEvent.click(screen.getByRole('button', { name: t.portal.join }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://app.example.org/join/tok'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lessons/l1/join');
  });

  it('before the window: no button, the opening time on the family clock', () => {
    show({}, new Date('2026-10-27T15:00:00.000Z'));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(t.portal.opensAt.replace('{time}', '18:50'))).toBeTruthy();
  });

  it('after the window: «انتهى وقت الدخول»', () => {
    show({}, new Date('2026-10-27T17:00:00.000Z'));
    expect(screen.getByText(t.portal.closed)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('an external lesson opens its own link in a new tab, only when the API sent it', () => {
    show({ way_in: 'external', meeting_url: 'https://meet.example.org/abc' });
    const link = screen.getByRole('link', { name: t.portal.join });
    expect([link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]).toEqual(['https://meet.example.org/abc', '_blank', 'noopener noreferrer']);
  });

  it('no way in known yet, or no link yet: says the link will come', () => {
    show({ way_in: 'none' });
    expect(screen.getByText(t.portal.noWayIn)).toBeTruthy();
  });

  it('a refused join shows the classroom’s own message', async () => {
    apiSend.mockRejectedValue(new Error('down'));
    show({});
    fireEvent.click(screen.getByRole('button', { name: t.portal.join }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
