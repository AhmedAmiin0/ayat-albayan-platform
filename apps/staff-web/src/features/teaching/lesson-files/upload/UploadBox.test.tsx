import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fileView, LESSON } from '@/features/teaching/lesson-files/lesson-files.fixture';
import { UploadBox } from './UploadBox';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
const uploadSigned = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@/lib/storage/upload-slot', () => ({ uploadSigned }));

const F = t.lessonFiles;
const slot = { bucket: 'report-attachments', path: `${LESSON}/x.pdf`, token: 't', signed_url: 'u' };

function pick(...files: File[]) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UploadBox lessonId={LESSON} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText(F.pickFile), { target: { files } });
}

afterEach(() => {
  mockApi.reset('write');
  uploadSigned.mockReset();
});

describe('UploadBox', () => {
  it('refuses a video before anything is sent', () => {
    pick(new File(['x'], 'clip.mp4', { type: 'video/mp4' }));
    expect(screen.getByText(F.badType)).toBeTruthy();
    expect(mockApi.writes()).toHaveLength(0);
  });

  it('signs, uploads, then registers a PDF', async () => {
    mockApi.onWrite(async ({ method: _m, path }) =>
      path.endsWith('/upload-url') ? slot : fileView({ mime: 'application/pdf', media: 'pdf' }),
    );
    uploadSigned.mockResolvedValue({ error: null });
    pick(new File(['%PDF'], 'صفحة الحفظ.pdf', { type: 'application/pdf' }));
    await waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: `/lessons/${LESSON}/files`,
        body: expect.objectContaining({
          path: slot.path,
          title: 'صفحة الحفظ',
          kind: 'homework',
          visible_to_family: true,
        }),
      }),
    );
    expect(await screen.findByText(F.uploaded)).toBeTruthy();
  });

  it('says so when the storage refused the file', async () => {
    mockApi.onWrite(() => slot);
    uploadSigned.mockResolvedValue({ error: new Error('403') });
    pick(new File(['x'], 'a.png', { type: 'image/png' }));
    expect(await screen.findByText(F.uploadFailed)).toBeTruthy();
  });
});

describe('UploadBox with several files', () => {
  it('sends each allowed file in turn with a line each; a refused one says why', async () => {
    mockApi.onWrite(async ({ method: _m, path }) =>
      path.endsWith('/upload-url') ? slot : fileView(),
    );
    uploadSigned.mockResolvedValue({ error: null });
    pick(
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    );
    await waitFor(() => expect(screen.getAllByText(F.uploaded)).toHaveLength(2));
    expect(screen.getByText(F.badType)).toBeTruthy();
    expect(uploadSigned).toHaveBeenCalledTimes(2);
  });
});
