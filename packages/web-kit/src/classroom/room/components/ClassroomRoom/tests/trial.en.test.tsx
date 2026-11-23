import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ClassroomRoom } from '#/classroom/room/components/ClassroomRoom/ClassroomRoom.tsx';
import { fakeClient, tile } from '#/classroom/room/livekit/fake-client.ts';

vi.mock('#/lib/i18n/i18n.ts', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('#/lib/i18n/locale.ts', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('a trial lesson room says, in English, that text chat is closed', () => {
  const c = fakeClient({ tiles: [tile({ key: 'me', name: 'Joud', isLocal: true, role: 'guest' })] });
  render(<ClassroomRoom join={{ url: 'u', token: 't', room: 'r', role: 'guest', chat: false }} make={() => c} />);
  expect(screen.getByText('Text chat is closed in trial lessons.')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/[؀-ۿ]/);
});
