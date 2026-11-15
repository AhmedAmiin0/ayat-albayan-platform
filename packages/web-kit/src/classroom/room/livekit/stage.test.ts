import { describe, expect, it } from 'vitest';
import { tile } from './fake-client';
import { gridColumns, layoutOf } from './stage';

const me = tile({ key: 'me', isLocal: true });
const ali = tile({ key: 'ali' });
const aliScreen = tile({ key: 'ali:screen', identity: 'ali', kind: 'screen' });
const tBoard = tile({ key: 't:screen', identity: 't', kind: 'screen', isBoard: true });

describe('layoutOf', () => {
  it('nothing shared: a balanced grid of everyone', () => {
    expect(layoutOf([me, ali], false)).toEqual({ mode: 'grid', tiles: [me, ali] });
  });

  it('a shared screen takes the stage, the cameras go to the strip', () => {
    expect(layoutOf([me, ali, aliScreen], false)).toEqual({ mode: 'stage', board: false, stage: aliScreen, strip: [me, ali] });
  });

  it('the open board takes the stage; other screens stay in the strip, shared-board videos are hidden', () => {
    expect(layoutOf([me, ali, aliScreen, tBoard], true)).toEqual({ mode: 'stage', board: true, stage: null, strip: [me, ali, aliScreen] });
  });

  it('with the board closed here, someone’s shared board is a stage like any screen', () => {
    expect(layoutOf([me, tBoard], false)).toMatchObject({ mode: 'stage', stage: tBoard });
  });
});

describe('gridColumns', () => {
  it('1 / 2 / 4 / 6 / more tiles get their own column steps', () => {
    expect(gridColumns(1)).toBe('grid-cols-1');
    expect(gridColumns(2)).toContain('@xl:grid-cols-2');
    expect(gridColumns(4)).toContain('@md:grid-cols-2');
    expect(gridColumns(6)).toContain('@4xl:grid-cols-3');
    expect(gridColumns(9)).toContain('@6xl:grid-cols-4');
  });
});
