import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { tile } from './fake-client';
import { RoomStage } from './RoomStage';

const S = t.classroom.stage;
const shared = tile({ key: 't:screen', identity: 't', name: 'أبرار', kind: 'screen', hasVideo: true });
const strip = [tile({ key: 'me', isLocal: true }), tile({ key: 't', name: 'أبرار' })];

function open() {
  render(<RoomStage stage={shared} board={null} strip={strip} attach={() => () => undefined} actionFor={() => null} />);
}

describe('RoomStage: the shared screen', () => {
  it('never crops the screen and lets the camera strip be hidden', () => {
    open();
    expect(screen.getByLabelText(t.classroom.screenOf.replace('{name}', 'أبرار')).querySelector('video')?.className).toContain('object-contain');
    fireEvent.click(screen.getByRole('button', { name: S.hideStrip }));
    expect(screen.queryByRole('list', { name: t.classroom.people })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: S.showStrip }));
    expect(screen.getByRole('list', { name: t.classroom.people })).toBeTruthy();
  });

  it('a click maximises it over the whole viewport (overlay without the Fullscreen API), another restores it', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: S.maximize }));
    const stage = screen.getByRole('button', { name: S.minimize });
    expect(stage.getAttribute('aria-pressed')).toBe('true');
    expect(stage.parentElement?.className).toContain('fixed inset-0 z-50');
    expect(screen.getAllByRole('list', { name: t.classroom.people })).toHaveLength(2); // + picture-in-picture
    fireEvent.click(stage);
    expect(screen.getByRole('button', { name: S.maximize })).toBeTruthy();
  });

  it('keyboard: Enter maximises, Esc leaves; the PiP strip can be hidden', () => {
    open();
    fireEvent.keyDown(screen.getByRole('button', { name: S.maximize }), { key: 'Enter' });
    const pipToggle = screen.getAllByRole('button', { name: S.hideStrip }).at(-1);
    if (pipToggle) fireEvent.click(pipToggle);
    expect(screen.getAllByRole('list', { name: t.classroom.people })).toHaveLength(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: S.maximize })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('button', { name: S.maximize }), { key: ' ' });
    expect(screen.getByRole('button', { name: S.minimize })).toBeTruthy();
  });
});
