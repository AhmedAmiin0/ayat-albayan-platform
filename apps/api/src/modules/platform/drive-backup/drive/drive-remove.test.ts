import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { archivePresent, removeArchive, type Answer, type Options } from './drive-remove';

// The real adapter's permanent delete (docs/45 §5.1): read first, delete only the backup's own.

const FILES = 'https://drive.example.test/drive/v3/files';
const MARK = { ab_source: 'platform', ab_backup: 'minio' };

function drive(file: object | null, deleteFails?: Error) {
  const calls: string[] = [];
  const call = (o: Options): Promise<Answer> => {
    const method = o.method ?? 'GET';
    calls.push(method);
    const fail =
      method === 'GET' ? file === null && new GoogleApiError(404, 'notFound') : deleteFails;
    if (fail) return Promise.reject(fail);
    return Promise.resolve({
      data: method === 'GET' ? file : '',
      status: 200,
      headers: new Headers(),
    });
  };
  return { call, calls };
}
const input = { fileId: 'file_1', folderId: 'folder_1', files: FILES };

describe('removeArchive', () => {
  it('a marked file in the backup folder: DELETE (for good, not the trash)', async () => {
    const d = drive({ parents: ['folder_1'], appProperties: MARK });
    expect(await removeArchive(d.call, input)).toBe('deleted');
    expect(d.calls).toEqual(['GET', 'DELETE']);
  });

  it.each([
    ['no marker', { parents: ['folder_1'], appProperties: { other: '1' } }],
    ['another folder', { parents: ['folder_2'], appProperties: MARK }],
  ])('%s: left alone', async (_, file) => {
    const d = drive(file);
    expect(await removeArchive(d.call, input)).toBe('foreign');
    expect(d.calls).toEqual(['GET']);
  });

  it('already gone (404 on read or on delete): gone, not an error', async () => {
    expect(await removeArchive(drive(null).call, input)).toBe('gone');
    const raced = drive(
      { parents: ['folder_1'], appProperties: MARK },
      new GoogleApiError(404, 'x'),
    );
    expect(await removeArchive(raced.call, input)).toBe('gone');
  });

  it('any other failure is thrown', async () => {
    const d = drive({ parents: ['folder_1'], appProperties: MARK }, new GoogleApiError(500, 'x'));
    await expect(removeArchive(d.call, input)).rejects.toThrow('500');
  });
});

describe('archivePresent (before a full is sealed)', () => {
  const own = { parents: ['folder_1'], appProperties: MARK };
  it.each([
    ['the backup’s own file', own, true],
    ['trashed', { ...own, trashed: true }, false],
    ['another folder', { ...own, parents: ['folder_2'] }, false],
    ['gone (404)', null, false],
  ])('%s', async (_, file, present) => {
    const d = drive(file);
    expect(await archivePresent(d.call, input)).toBe(present);
    expect(d.calls).toEqual(['GET']);
  });
});
