import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ASSISTANT, STUDENT_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const url = `/students/${STUDENT_ID}/assistants`;

describe('assistant routes: inputs parsed by the route object', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('400 for a body without a profile uuid, before any write', async () => {
    const res = await h.call({ method: 'POST', url, body: { profileId: 'nope' } });
    expect(res.statusCode).toBe(400);
    expect(h.assistants.assign).not.toHaveBeenCalled();
  });

  it('400 for a student or profile id that is not a uuid', async () => {
    expect((await h.call({ method: 'GET', url: '/students/x/assistants' })).statusCode).toBe(400);
    const remove = await h.call({ method: 'DELETE', url: `${url}/x` });
    expect(remove.statusCode).toBe(400);
    expect(h.assistants.remove).not.toHaveBeenCalled();
  });

  it('400 for a day that is not two instants', async () => {
    const day = '?from=2026-10-05&to=2026-10-06T00:00:00.000Z';
    const res = await h.call({ method: 'GET', url: `/assistants/me/lessons${day}`, token: 'assistant' });
    expect(res.statusCode).toBe(400);
  });

  it('passes the parsed pick and the caller to the service', async () => {
    const res = await h.call({ method: 'POST', url, body: { profileId: ASSISTANT.id } });
    expect(res.statusCode).toBe(200);
    expect(h.assistants.assign).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: STUDENT_ID, profileId: ASSISTANT.id }),
    );
  });
});
