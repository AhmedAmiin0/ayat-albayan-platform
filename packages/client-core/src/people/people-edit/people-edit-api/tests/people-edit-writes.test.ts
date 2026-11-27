import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { peopleEditWrites } from '../people-edit-writes';

const S = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const G = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';

const writesAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { apiSend, writes: peopleEditWrites(client) };
};

describe('people edit writes (R-STU-02, R-STU-04)', () => {
  it('sends the forms’ patches to the student and the family', async () => {
    const { apiSend, writes } = writesAnswering({ id: S });
    await writes.saveStudent({ id: S, patch: { goal: 'حفظ' } });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/people/students/${S}`, { goal: 'حفظ' });
    await writes.saveFamily({ id: G, patch: { country: 'SA' } });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/people/guardians/${G}`, { country: 'SA' });
  });

  it('removes the family’s second number by guardian and phone', async () => {
    const { apiSend, writes } = writesAnswering(undefined);
    await writes.removeSecondPhone({ guardianId: G, phone: '+201000000002' });
    const path = `/people/guardians/${G}/phones/%2B201000000002`;
    expect(apiSend).toHaveBeenCalledWith('DELETE', path, undefined);
  });

  it('moves a student and turns the contact flag into its body', async () => {
    const moved = writesAnswering({ student_id: S, guardian_id: G });
    const body = { guardian_id: G };
    await expect(moved.writes.moveFamily({ studentId: S, body })).resolves.toEqual({
      student_id: S,
      guardian_id: G,
    });
    const self = writesAnswering({ id: S, contact_is_self: false });
    await self.writes.setContactSelf({ studentId: S, value: false });
    const path = `/people/students/${S}/contact-self`;
    expect(self.apiSend).toHaveBeenCalledWith('PATCH', path, { contact_is_self: false });
  });

  it('converts a guardian to a student and a student to a guardian', async () => {
    const student = writesAnswering({ id: S, code: 'AB-0300' });
    await expect(student.writes.guardianToStudent(G)).resolves.toEqual({ id: S, code: 'AB-0300' });
    const family = writesAnswering({ guardian_id: G });
    await expect(family.writes.studentToGuardian(S)).resolves.toEqual({ guardian_id: G });
    const path = `/people/students/${S}/to-guardian`;
    expect(family.apiSend).toHaveBeenCalledWith('POST', path, undefined);
  });
});
