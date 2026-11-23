import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { channelMessage } from '#/components/channel/channel.fixtures.ts';
import { AttachmentBody } from './AttachmentBody';

const c = t.studentChannel;
const file = (over = {}) => ({
  ...{ mime: 'application/pdf', size: 245_760, name: 'خطة الحفظ.pdf', duration_ms: null },
  ...{ url: 'https://files.example.org/plan.pdf' },
  ...over,
});

describe('a message file on the web (no longer an empty bubble)', () => {
  it('a PDF: a link to the browser viewer, its name and «PDF · 240 كيلوبايت»', () => {
    render(<AttachmentBody message={channelMessage({ kind: 'pdf', body: '', attachment: file() })} />);
    const link = screen.getByRole('link', { name: t.inbox.pdf.open.replace('{name}', 'خطة الحفظ.pdf') });
    expect(link.getAttribute('href')).toBe('https://files.example.org/plan.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain(t.inbox.pdf.kb.replace('{n}', '240'));
  });

  it('a photo: a click opens it at full size with «تنزيل الملف»; Esc closes it', () => {
    const photo = file({ mime: 'image/jpeg', name: 'p.jpg', url: 'https://files.example.org/p.jpg' });
    render(<AttachmentBody message={channelMessage({ kind: 'photo', body: 'صفحة الواجب', attachment: photo })} />);
    fireEvent.click(screen.getByRole('button', { name: 'صفحة الواجب' }));
    const dialog = screen.getByRole('dialog', { name: 'صفحة الواجب' });
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('https://files.example.org/p.jpg');
    expect(screen.getByRole('link', { name: c.web.download })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a voice note: play, the waveform as a slider at its length, the clock', () => {
    const voice = file({ mime: 'audio/webm', name: 'voice.webm', duration_ms: 42_000 });
    render(<AttachmentBody message={channelMessage({ id: 'v1', kind: 'voice', attachment: voice })} />);
    expect(screen.getByRole('button', { name: c.media.play })).toBeTruthy();
    const slider = screen.getByRole('slider', { name: c.kinds.voice });
    expect(slider.getAttribute('aria-valuemax')).toBe('42');
    expect(screen.getByText('0:42')).toBeTruthy();
    expect(document.querySelector('audio')?.getAttribute('src')).toBe(voice.url);
  });

  it('nothing for a text, or a file without its link (deleted for everyone)', () => {
    const { container } = render(
      <>
        <AttachmentBody message={channelMessage()} />
        <AttachmentBody message={channelMessage({ kind: 'pdf', attachment: file({ url: null }) })} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });
});
