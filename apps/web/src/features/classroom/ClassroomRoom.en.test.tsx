import en from '@ab/shared/i18n/en.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from './fake-client';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('the room reads English, no Arabic letters left', () => {
  const c = fakeClient({
    canPlayAudio: false,
    tiles: [tile({ key: 'me', name: 'Abrar', isLocal: true }), tile({ key: 's', name: 'Joud', speaking: true, micOn: false })],
  });
  render(<ClassroomRoom join={{ url: 'u', token: 't', room: 'r', role: 'admin' }} make={() => c} />);
  for (const text of [en.classroom.enableAudio, en.classroom.micOn, en.classroom.camOn, en.classroom.shareOn, en.classroom.leave, en.classroom.speaking, en.classroom.muted]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.getByText(`Abrar (${en.classroom.you})`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: en.classroom.leave }));
  expect(screen.getByText(en.classroom.ended)).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/[؀-ۿ]/);
});
