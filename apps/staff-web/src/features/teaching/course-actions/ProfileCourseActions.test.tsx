import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ProfileCourseActions } from './ProfileCourseActions';

const apiFetch = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const show = (list: string[]) => {
  perms.list = list;
  renderWithClient(<ProfileCourseActions studentId="s1" onDone={vi.fn()} />);
};

describe('ProfileCourseActions: the current package from the server, never the balance', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('resolves it through the stop preview when the stop is held', async () => {
    apiFetch.mockResolvedValue({ subscriptionId: 'sub-1', stopped: null });
    show(['subscriptions.stop', 'courses.reschedule']);
    expect(await screen.findByRole('button', { name: t.courseActions.stop.action })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/course-stop');
  });

  it('else through the times view', async () => {
    apiFetch.mockResolvedValue({ course: { subscriptionId: 'sub-1' } });
    show(['courses.reschedule']);
    expect(await screen.findByRole('button', { name: t.courseActions.times.action })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/course-times/change');
  });

  it('hidden on 404 subscription_not_found', async () => {
    apiFetch.mockImplementation(() =>
      Promise.reject(new ApiError(404, { code: 'subscription_not_found' })),
    );
    show(['subscriptions.stop']);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/course-stop');
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  it('nothing without any key, and no call', () => {
    show([]);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('button')).toEqual([]);
  });
});
