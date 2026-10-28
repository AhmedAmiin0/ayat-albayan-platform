import { AVATAR_MAX_BYTES } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { StaffPhotoControl, type StaffPhotoControlProps } from './StaffPhotoControl';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ can: (p: string) => granted.has(p) }) }));

const P = t.staffPhoto;
const SIGNED = { bucket: 'avatars', path: 't1/avatar-1.png', token: 'tok', signed_url: 'https://sb.test/up' };
const calls: string[] = [];

function renderControl(props: Partial<StaffPhotoControlProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <StaffPhotoControl kind="teachers" id="t1" name="فاطمة" hasPhoto={false} {...props} />
    </QueryClientProvider>,
  );
  return { invalidate };
}
const png = (size = 1024) => {
  const f = new File(['x'], 'p.png', { type: 'image/png' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const pick = (file: File) => fireEvent.change(screen.getByLabelText(P.change), { target: { files: [file] } });

beforeEach(() => {
  calls.length = 0;
  granted.clear();
  granted.add('teachers.write');
  apiSend.mockReset().mockImplementation((method: string, path: string) => {
    calls.push(`${method} ${path}`);
    return Promise.resolve(path.endsWith('upload-url') ? SIGNED : { avatar_url: method === 'PUT' ? 'https://sb.test/a.png' : null });
  });
  uploadToSignedUrl.mockReset().mockImplementation(() => {
    calls.push('upload');
    return Promise.resolve({ data: {}, error: null });
  });
});

describe('StaffPhotoControl (owner 2026-10-28)', () => {
  it('hidden without the write permission of its kind', () => {
    granted.clear();
    granted.add('users.write');
    renderControl();
    expect(screen.queryByText(P.change)).toBeNull();
  });

  it('upload: upload-url, the signed upload, then PUT the path; refetches the photo queries', async () => {
    const { invalidate } = renderControl();
    pick(png());
    expect(await screen.findByText(P.saved)).toBeTruthy();
    expect(calls).toEqual(['POST /teachers/t1/avatar/upload-url', 'upload', 'PUT /teachers/t1/avatar']);
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/t1/avatar/upload-url', { mime: 'image/png', size: 1024 });
    expect(apiSend).toHaveBeenLastCalledWith('PUT', '/teachers/t1/avatar', { path: SIGNED.path });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['teachers'] });
  });

  it('a file over 2 MB is refused before any request', () => {
    renderControl();
    pick(png(AVATAR_MAX_BYTES + 1));
    expect(screen.getByText(t.account.errors.avatar_too_large)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('remove asks first; cancel keeps the photo, confirm DELETEs', async () => {
    granted.add('users.write');
    renderControl({ kind: 'users', id: 'u9', hasPhoto: true });
    fireEvent.click(screen.getByRole('button', { name: P.remove }));
    expect(screen.getByText(P.confirmRemove.replace('{name}', 'فاطمة'))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    fireEvent.click(screen.getByRole('button', { name: P.remove }));
    const group = screen.getByRole('group', { name: P.remove });
    fireEvent.click(group.querySelector('button') ?? group);
    expect(await screen.findByText(P.removed)).toBeTruthy();
    expect(calls).toEqual(['DELETE /users/u9/avatar']);
  });

  it('400 avatar_not_staff reads as its own message', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(400, { code: 'avatar_not_staff' }));
    renderControl();
    pick(png());
    await waitFor(() => expect(screen.getByText(P.errors.avatar_not_staff)).toBeTruthy());
  });

  it('no remove button without a photo', () => {
    renderControl();
    expect(screen.queryByRole('button', { name: P.remove })).toBeNull();
  });
});
