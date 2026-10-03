import { describe, expect, it } from 'vitest';
import { isCountableSession } from './earning-countable.js';

describe('isCountableSession', () => {
  it('counts a subscription lesson with a subscribed student', () => {
    expect(isCountableSession({ rulePackage: '8', studentStatuses: ['active'] })).toBe(true);
  });
  it('counts a lesson without a rule (make-up) when a student is subscribed', () => {
    expect(isCountableSession({ rulePackage: null, studentStatuses: ['active'] })).toBe(true);
  });
  it('never counts a trial lesson, even if the student is already active', () => {
    expect(isCountableSession({ rulePackage: 'trial', studentStatuses: ['active'] })).toBe(false);
  });
  it.each(['trial', 'paused', 'churned'])('does not count a %s student alone', (status) => {
    expect(isCountableSession({ rulePackage: '8', studentStatuses: [status] })).toBe(false);
  });
  it('counts a group lesson when at least one student is subscribed', () => {
    expect(isCountableSession({ rulePackage: '8', studentStatuses: ['churned', 'active'] })).toBe(true);
  });
  it('does not count a lesson with no students', () => {
    expect(isCountableSession({ rulePackage: '8', studentStatuses: [] })).toBe(false);
  });
});
