import { avatarTone } from '@ab/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { DETAIL, granted, renderWithClient } from '@/features/people/users/users-test-kit';
import { UserPhoto } from './UserPhoto';

vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

const PHOTO = 'https://sb.test/avatars/u1.png';
const photoOf = (name: string) => t.staffPhoto.photoOf.replace('{name}', name);

describe('UserPhoto (owner 2026-10-28)', () => {
  beforeEach(() => {
    granted.clear();
    granted.add('users.write');
  });

  it('a staff login: the photo and, with users.write, change / remove', () => {
    renderWithClient(<UserPhoto user={{ ...DETAIL, avatar_url: PHOTO }} canWrite />);
    expect(screen.getByRole('img', { name: photoOf(DETAIL.full_name) }).getAttribute('src')).toBe(PHOTO);
    expect(screen.getByText(t.staffPhoto.change)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.staffPhoto.remove })).toBeTruthy();
  });

  it('read only: the photo without the buttons', () => {
    renderWithClient(<UserPhoto user={{ ...DETAIL, avatar_url: PHOTO }} canWrite={false} />);
    expect(screen.getByRole('img', { name: photoOf(DETAIL.full_name) })).toBeTruthy();
    expect(screen.queryByText(t.staffPhoto.change)).toBeNull();
  });

  it.each(['student', 'guardian'] as const)('a %s: initials only, never a photo or the buttons', (role) => {
    renderWithClient(<UserPhoto user={{ ...DETAIL, role, avatar_url: PHOTO }} canWrite />);
    expect(screen.getByRole('img', { name: DETAIL.full_name }).querySelector('img')).toBeNull();
    expect(screen.queryByText(t.staffPhoto.change)).toBeNull();
  });

  it("the initials' tone hashes avatar_seed (a teacher's login = the teacher's tone), else the user id", () => {
    const tone = () => screen.getByRole('img', { name: DETAIL.full_name }).getAttribute('data-avatar-tone');
    const { unmount } = renderWithClient(<UserPhoto user={{ ...DETAIL, avatar_url: null, avatar_seed: 't1' }} canWrite={false} />);
    expect(tone()).toBe(String(avatarTone('t1') + 1));
    unmount();
    renderWithClient(<UserPhoto user={{ ...DETAIL, avatar_url: null }} canWrite={false} />);
    expect(tone()).toBe(String(avatarTone(DETAIL.id) + 1));
  });
});
