import * as DocumentPicker from 'expo-document-picker';
import { pickChannelCamera, pickChannelPdf, pickChannelPhoto } from './channel-pickers';

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

test('a PDF with its own name, its bytes from base64; cancelled → null', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        name: 'خطة.pdf',
        uri: 'file:///a.pdf',
        mimeType: 'application/pdf',
        lastModified: 0,
        base64: 'AAEC',
      },
    ],
  });
  expect(await pickChannelPdf()).toMatchObject({
    name: 'خطة.pdf',
    size: 3,
    mime: 'application/pdf',
  });
  expect(await pickChannelPdf()).toBeNull();
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
