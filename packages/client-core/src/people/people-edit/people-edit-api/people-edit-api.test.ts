import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { peopleEditCalls } from './people-edit-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const GID = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';
const option = { id: GID, name: 'أم سهيلة', phone_e164: '+966501234567', students: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend, calls: peopleEditCalls(client) };
};

describe('people edit calls (R-STU-02, R-STU-04)', () => {
  it('searches families with the term in the query', async () => {
    const { calls, apiFetch } = clientAnswering([option]);
    await expect(calls.families('AB 0183')).resolves.toEqual([option]);
    expect(apiFetch).toHaveBeenCalledWith('/people/guardians?search=AB%200183');
  });

  it('sends PATCH of a student and of a family with their bodies', async () => {
    const { calls, apiSend } = clientAnswering({ id: ID });
    await expect(calls.editStudent(ID, { goal: 'حفظ' })).resolves.toEqual({ id: ID });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/people/students/${ID}`, { goal: 'حفظ' });
    await calls.editGuardian(GID, { name: 'أم جود' });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/people/guardians/${GID}`, { name: 'أم جود' });
  });

  it('sends DELETE of the second number with the plus encoded', async () => {
    const { calls, apiSend } = clientAnswering(undefined);
    await expect(calls.removePhone({ id: GID, phone: '+201000000002' })).resolves.toBeUndefined();
    const path = `/people/guardians/${GID}/phones/%2B201000000002`;
    expect(apiSend).toHaveBeenCalledWith('DELETE', path, undefined);
  });

  it('sends the move, the contact switch and both conversions', async () => {
    const moved = clientAnswering({ student_id: ID, guardian_id: GID });
    await moved.calls.move(ID, { guardian_id: GID });
    expect(moved.apiSend).toHaveBeenCalledWith('POST', `/people/students/${ID}/guardian`, {
      guardian_id: GID,
    });
    const self = clientAnswering({ id: ID, contact_is_self: true });
    await self.calls.contactSelf(ID, { contact_is_self: true });
    const selfPath = `/people/students/${ID}/contact-self`;
    expect(self.apiSend).toHaveBeenCalledWith('PATCH', selfPath, { contact_is_self: true });
    const student = clientAnswering({ id: ID, code: 'AB-0184' });
    await student.calls.toStudent(GID);
    const toStudent = `/people/guardians/${GID}/to-student`;
    expect(student.apiSend).toHaveBeenCalledWith('POST', toStudent, undefined);
    const family = clientAnswering({ guardian_id: GID });
    await expect(family.calls.toGuardian(ID)).resolves.toEqual({ guardian_id: GID });
  });

  it('throws bad_response for an edit view without its family', async () => {
    const { calls } = clientAnswering({ student: {} });
    const failure = await calls.view(ID).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
