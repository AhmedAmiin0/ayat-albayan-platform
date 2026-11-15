import type { SharedFile, SharedItems } from './read-share';
import { shareProblem, sharedKind } from './share-rules';

const MB = 1024 * 1024;
const file = (mime: string, size: number | null = 1000): SharedFile => ({
  uri: 'file:///cache/share-1-a',
  mime,
  name: 'a',
  size,
  id: 'id',
  n: 1,
});
const files = (...list: SharedFile[]): SharedItems => ({ text: '', files: list });
const check = (items: SharedItems, teacher = false) =>
  shareProblem({ items, teacher, maxBytes: 10 * MB });

test('nothing shared (a text/plain share with only a stream) is empty', () => {
  expect(check({ text: '', files: [] })).toBe('empty');
  expect(check({ text: '   ', files: [] })).toBe('empty');
});

test('eleven files are too many; ten are fine', () => {
  const ten = Array.from({ length: 10 }, () => file('image/jpeg'));
  expect(check(files(...ten))).toBeNull();
  expect(check(files(...ten, file('image/jpeg')))).toBe('too_many');
});

test('a teacher shares text and links only', () => {
  expect(check(files(file('image/jpeg')), true)).toBe('teacher_files');
  expect(check({ text: 'https://example.test/a', files: [] }, true)).toBeNull();
});

test('video, zip and text files are refused; any image (HEIC too, re-encoded later) and PDFs pass', () => {
  expect(check(files(file('video/mp4')))).toBe('file_type');
  expect(check(files(file('application/zip')))).toBe('file_type');
  expect(check(files(file('image/jpeg'), file('text/plain')))).toBe('file_type');
  expect(check(files(file('image/heic'), file('application/pdf')))).toBeNull();
});

test('a PDF over the limit is refused before it is read; an unknown size waits for the send', () => {
  expect(check(files(file('application/pdf', 11 * MB)))).toBe('file_too_large');
  expect(check(files(file('application/pdf', null)))).toBeNull();
  expect(check(files(file('image/jpeg', 40 * MB)))).toBeNull();
});

test('sharedKind: photo, pdf or other', () => {
  expect(sharedKind(file('image/webp'))).toBe('image');
  expect(sharedKind(file('application/pdf'))).toBe('pdf');
  expect(sharedKind(file('audio/mpeg'))).toBe('other');
});
