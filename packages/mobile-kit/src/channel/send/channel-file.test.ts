import { fileSizeText } from '@ab/shared';
import { ChannelFileError, channelFileProblem as fileProblem } from '@ab/client-core';
import { fileErrorText } from './channel-file';
import { t } from '../../lib/i18n/i18n';

const pick = (mime: string, size: number) => ({ mime, size, name: 'f', bytes: new ArrayBuffer(1) });

test('the shared rule first: a type the chat takes, within its cap', () => {
  expect(fileProblem(pick('image/png', 1000))).toBeNull();
  expect(fileProblem(pick('text/plain', 1000))).toBe('badType');
  expect(fileProblem(pick('image/png', 11 * 1024 * 1024))).toBe('tooLarge');
});

test('a refusal in words: the cap of its type', () => {
  const tooLarge = new ChannelFileError('tooLarge');
  expect(fileErrorText(tooLarge, 'image/png')).toBe(
    t.studentChannel.media.tooLarge.replace('{n}', '10'),
  );
  expect(fileErrorText(tooLarge, 'application/pdf')).toContain('15');
  expect(fileErrorText(new Error('x'), 'image/png')).toBe(t.studentChannel.media.failed);
});

test('sizes (the shared fileSizeText): whole kilobytes under 1 MB (at least 1), else one decimal', () => {
  expect(fileSizeText(100, t.inbox.pdf)).toBe(t.inbox.pdf.kb.replace('{n}', '1'));
  expect(fileSizeText(1.5 * 1024 * 1024, t.inbox.pdf)).toBe(t.inbox.pdf.mb.replace('{n}', '1.5'));
});
