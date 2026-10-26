import { Share } from 'react-native';
import { mockClipboard } from '@/test/native-mocks';
import { copyOrShare, copyToClipboard } from './clipboard';

const URL = 'https://meet.example.org/room-1';
const gone = () => {
  throw new Error('no native module');
};

let setString: jest.Mock;
beforeEach(() => {
  setString = mockClipboard();
});
afterEach(() => jest.restoreAllMocks());

test('copyToClipboard: the module takes the exact text → true', () => {
  expect(copyToClipboard(URL)).toBe(true);
  expect(setString).toHaveBeenCalledWith(URL);
});

test('copyToClipboard: a throwing module → false, never a crash', () => {
  setString.mockImplementation(gone);
  expect(copyToClipboard(URL)).toBe(false);
});

test('copyToClipboard: a missing module (the getter throws) → false', () => {
  Object.defineProperty(jest.requireActual('react-native'), 'Clipboard', { get: gone, configurable: true });
  expect(copyToClipboard(URL)).toBe(false);
});

test('copyOrShare: copied, else the share sheet, else failed', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  expect(await copyOrShare(URL)).toBe('copied');
  expect(share).not.toHaveBeenCalled();
  setString.mockImplementation(gone);
  expect(await copyOrShare(URL)).toBe('shared');
  expect(share).toHaveBeenCalledWith({ message: URL });
  share.mockRejectedValue(new Error('no sheet'));
  expect(await copyOrShare(URL)).toBe('failed');
});
