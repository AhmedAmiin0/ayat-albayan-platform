import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/testing';
import { PeopleList } from './PeopleList';

const list = () => screen.getByRole('list', { name: t.classroom.people });

describe('PeopleList', () => {
  it('lists the camera tiles only, marking me', () => {
    const tiles = [
      tile({ key: 'me', name: 'Yusuf', isLocal: true }),
      tile({ key: 'f', name: 'Fatima' }),
      tile({ key: 'screen', name: 'Shared', kind: 'screen' }),
    ];
    render(<PeopleList tiles={tiles} variant="staff" />);
    const rows = within(list()).getAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('.font-semibold')?.textContent)).toEqual([
      `Yusuf (${t.classroom.you})`,
      'Fatima',
    ]);
    expect(screen.queryByText('Shared')).toBeNull();
  });

  it('names the role and says who speaks, who is muted and whose camera is off', () => {
    const tiles = [
      tile({ key: 'f', name: 'Fatima', role: 'teacher', speaking: true, micOn: false }),
    ];
    render(<PeopleList tiles={tiles} variant="staff" />);
    const row = within(list()).getByRole('listitem');
    expect(within(row).getByText(t.classroom.roles.teacher)).toBeTruthy();
    expect(within(row).getByText(t.classroom.speaking)).toBeTruthy();
    expect(within(row).getByText(t.classroom.muted)).toBeTruthy();
    expect(within(row).getByText(t.mobileRoom.preview.camOff)).toBeTruthy();
  });

  it('says nothing about a quiet person with mic and camera on', () => {
    const tiles = [tile({ key: 'a', name: 'Ali', hasVideo: true })];
    render(<PeopleList tiles={tiles} variant="family" />);
    const row = within(list()).getByRole('listitem');
    expect(within(row).queryByText(t.classroom.speaking)).toBeNull();
    expect(within(row).queryByText(t.classroom.muted)).toBeNull();
    expect(within(row).queryByText(t.mobileRoom.preview.camOff)).toBeNull();
  });
});
