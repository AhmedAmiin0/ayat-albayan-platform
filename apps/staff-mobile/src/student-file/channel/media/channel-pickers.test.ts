import { pickChannelCamera, pickChannelPhoto } from './channel-pickers';

const mockPickReceipt = jest.fn();
jest.mock('@/payments', () => ({ pickReceipt: (s: string) => mockPickReceipt(s) }));

test('a photo from the phone’s photos, named by its type', async () => {
  const bytes = new ArrayBuffer(3);
  mockPickReceipt.mockResolvedValueOnce({
    uri: 'file:///p.png',
    mime: 'image/png',
    bytes,
    size: 3,
  });
  expect(await pickChannelPhoto()).toEqual({
    mime: 'image/png',
    name: 'photo.png',
    size: 3,
    bytes,
  });
  mockPickReceipt.mockResolvedValueOnce(null);
  expect(await pickChannelPhoto()).toBeNull();
});

test('a photo taken with the camera (the picker asks for the camera itself)', async () => {
  const bytes = new ArrayBuffer(2);
  mockPickReceipt.mockResolvedValueOnce({
    uri: 'file:///c.jpg',
    mime: 'image/jpeg',
    bytes,
    size: 2,
  });
  expect(await pickChannelCamera()).toEqual({
    mime: 'image/jpeg',
    name: 'photo.jpg',
    size: 2,
    bytes,
  });
  expect(mockPickReceipt).toHaveBeenLastCalledWith('camera');
});
