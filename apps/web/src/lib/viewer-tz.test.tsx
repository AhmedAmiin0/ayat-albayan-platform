import { setViewerPersonTz, viewerTz } from '@ab/client-core';
import { deviceTimeZone, resolveViewerTz } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meQuery } from '@/features/people/auth/me';
import { signOut } from '@/features/people/auth/sign-in';
import { apiFetch } from '@/lib/http/api';
import { useViewerTz } from './viewer-tz';

interface Session {
  data: { session: { access_token: string } | null };
}
const auth = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<Session> => ({ data: { session: { access_token: 'x' } } })),
  signOut: vi.fn(async () => undefined),
}));
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/http/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/features/people/auth/session-activity', () => ({ reportSession: vi.fn() }));
vi.mock('@/features/messaging/notifications/web-push/web-push', () => ({
  forgetWebPush: vi.fn(async () => undefined),
}));

const ME = { id: 'u1', email: null, role: 'teacher', permissions: [] };
const DEVICE = resolveViewerTz({ device: deviceTimeZone() });
const fetchMe = () => new QueryClient().query(meQuery);

function Zone() {
  return <span>{useViewerTz()}</span>;
}

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

describe('useViewerTz (docs/34 §2)', () => {
  it('re-renders when the person zone changes', () => {
    render(<Zone />);
    expect(screen.getByText('Asia/Riyadh')).toBeTruthy();
    act(() => setViewerPersonTz('Africa/Cairo'));
    expect(screen.getByText('Africa/Cairo')).toBeTruthy();
  });
});

describe('me.tz → the viewer-zone store', () => {
  it('GET /auth/me sets the signed-in person zone', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ...ME, tz: 'Africa/Cairo' });
    await fetchMe();
    expect(viewerTz()).toBe('Africa/Cairo');
  });

  it('signing out clears it (back to the device zone)', async () => {
    setViewerPersonTz('Africa/Cairo');
    await signOut(new QueryClient());
    expect(viewerTz()).toBe(DEVICE);
  });

  it('no session clears it too', async () => {
    setViewerPersonTz('Africa/Cairo');
    auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(await fetchMe()).toBeNull();
    expect(viewerTz()).toBe(DEVICE);
  });
});
