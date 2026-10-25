import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { ADMIN, STUDENT_ID } from '../classroom.fakes';
import { hashLinkToken, looksLikeLinkToken } from '../join/join-link.token';
import { StudentLinkAdminService } from './student-link.admin.service';
import { studentLinkQueries } from './student-link.fakes';
import type { StudentLinkQueries } from './student-link.queries';

let q: ReturnType<typeof studentLinkQueries>;
let audit: { record: ReturnType<typeof vi.fn> };
const issue = () =>
  new StudentLinkAdminService(q as unknown as StudentLinkQueries, audit as unknown as AuditService, 'https://app.example.test').issue({
    studentId: STUDENT_ID,
    actorId: ADMIN.id,
  });

beforeEach(() => {
  q = studentLinkQueries();
  audit = { record: vi.fn().mockResolvedValue(undefined) };
});

describe('POST /students/:id/join-link', () => {
  it('returns /s/<token> on the web origin and stores only the sha256 of the token', async () => {
    const { url } = await issue();
    const token = url.replace('https://app.example.test/s/', '');
    expect(looksLikeLinkToken(token)).toBe(true);
    expect(q.saveLink).toHaveBeenCalledWith({ studentId: STUDENT_ID, hash: hashLinkToken(token), actorId: ADMIN.id });
    expect(JSON.stringify(q.saveLink.mock.calls)).not.toContain(token);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'students', entityId: STUDENT_ID, action: 'join_link_issued' }));
  });

  it('rotates: every call is a new token (the stored hash is replaced)', async () => {
    const a = await issue();
    const b = await issue();
    expect(a.url).not.toBe(b.url);
    expect(q.saveLink).toHaveBeenCalledTimes(2);
  });

  it('404 student_not_found', async () => {
    q.student.mockResolvedValue(null);
    const e = (await issue().catch((x: HttpException) => x)) as HttpException;
    expect(e.getResponse()).toMatchObject({ code: 'student_not_found' });
    expect(q.saveLink).not.toHaveBeenCalled();
  });
});
