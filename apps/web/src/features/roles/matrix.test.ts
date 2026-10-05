import { PERMISSION_MODULES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  allState, columnState, grantedCount, hasWildcard, isGranted, moduleState, normalize,
  setAll, setColumn, setModule, setPermission, TOTAL_CELLS,
} from './matrix';

describe('setPermission', () => {
  it('manage on also turns view on', () => {
    expect(setPermission([], { module: 'leads', action: 'manage' }, true)).toEqual(['leads.view', 'leads.manage']);
  });

  it('view off also turns manage off', () => {
    expect(setPermission(['leads.view', 'leads.manage'], { module: 'leads', action: 'view' }, false)).toEqual([]);
  });

  it('manage off keeps view', () => {
    expect(setPermission(['leads.view', 'leads.manage'], { module: 'leads', action: 'manage' }, false)).toEqual(['leads.view']);
  });

  it('view on adds only view; other modules are untouched', () => {
    expect(setPermission(['inbox.view'], { module: 'leads', action: 'view' }, true)).toEqual(['leads.view', 'inbox.view']);
  });

  it('keeps catalogue order and drops unknown keys', () => {
    expect(normalize(['students.view', 'bogus', 'leads.view'])).toEqual(['leads.view', 'students.view']);
  });
});

describe('module, column and overall selection', () => {
  it('setModule grants or clears both cells', () => {
    expect(setModule([], 'payments', true)).toEqual(['payments.view', 'payments.manage']);
    expect(setModule(['payments.view', 'payments.manage', 'leads.view'], 'payments', false)).toEqual(['leads.view']);
  });

  it('reports none / some / all per module', () => {
    expect(moduleState([], 'leads')).toBe('none');
    expect(moduleState(['leads.view'], 'leads')).toBe('some');
    expect(moduleState(['leads.view', 'leads.manage'], 'leads')).toBe('all');
  });

  it('setColumn(view) selects every module view; setColumn(manage) also selects every view', () => {
    const view = setColumn([], 'view', true);
    expect(view).toHaveLength(PERMISSION_MODULES.length);
    expect(columnState(view, 'view')).toBe('all');
    expect(columnState(view, 'manage')).toBe('none');
    const manage = setColumn([], 'manage', true);
    expect(manage).toHaveLength(PERMISSION_MODULES.length * 2);
    expect(columnState(manage, 'view')).toBe('all');
  });

  it('clearing the view column clears everything (manage needs view)', () => {
    expect(setColumn(setAll(true), 'view', false)).toEqual([]);
  });

  it('clearing the manage column keeps the views', () => {
    const after = setColumn(setAll(true), 'manage', false);
    expect(columnState(after, 'view')).toBe('all');
    expect(columnState(after, 'manage')).toBe('none');
  });

  it('column state is "some" for a partial column', () => {
    expect(columnState(['leads.view'], 'view')).toBe('some');
  });

  it('setAll / allState / grantedCount agree', () => {
    expect(allState(setAll(true))).toBe('all');
    expect(allState(setAll(false))).toBe('none');
    expect(allState(['leads.view'])).toBe('some');
    expect(grantedCount(setAll(true))).toBe(TOTAL_CELLS);
    expect(grantedCount(['leads.view', 'x.view'])).toBe(1);
  });
});

describe('wildcard', () => {
  it('reads as granted everywhere', () => {
    expect(hasWildcard(['*'])).toBe(true);
    expect(isGranted(['*'], 'roles', 'manage')).toBe(true);
    expect(allState(['*'])).toBe('all');
    expect(grantedCount(['*'])).toBe(TOTAL_CELLS);
    expect(moduleState(['*'], 'leads')).toBe('all');
  });

  it('is not part of the grantable cells', () => {
    expect(normalize(['*', 'leads.view'])).toEqual(['leads.view', '*']);
    expect(isGranted([], 'leads', 'view')).toBe(false);
  });
});
