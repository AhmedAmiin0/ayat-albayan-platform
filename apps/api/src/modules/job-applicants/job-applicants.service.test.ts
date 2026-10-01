import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { applicant, APPLICANT_ID, fakeDeps } from '../leads/leads.fakes';
import { JobApplicantsService } from './job-applicants.service';

const ACTOR = 'admin-1';

function setup() {
  const deps = fakeDeps();
  return { ...deps, service: new JobApplicantsService(deps.asApplicants, deps.asAudit) };
}

describe('JobApplicantsService (R-LEAD-04)', () => {
  it('create stamps created_by and never sets a status (DB default new)', async () => {
    const { service, applicants } = setup();
    applicants.insert.mockResolvedValue(applicant());
    await service.create({ phone_e164: '+201001234567', name: 'أ. منى' }, ACTOR);
    expect(applicants.insert).toHaveBeenCalledWith({
      phone_e164: '+201001234567',
      name: 'أ. منى',
      created_by: ACTOR,
    });
  });

  it('get / update 404 for an unknown applicant', async () => {
    const { service, applicants } = setup();
    applicants.findById.mockResolvedValue(null);
    applicants.update.mockResolvedValue(null);
    await expect(service.get(APPLICANT_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(APPLICANT_ID, { notes: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('changeStatus follows the pipeline and audits', async () => {
    const { service, applicants, audit } = setup();
    applicants.findById.mockResolvedValue(applicant({ status: 'new' }));
    applicants.moveStatus.mockResolvedValue(applicant());
    await service.changeStatus({ id: APPLICANT_ID, to: 'reviewing', actorId: ACTOR });
    expect(applicants.moveStatus).toHaveBeenCalledWith({
      id: APPLICANT_ID,
      from: 'new',
      to: 'reviewing',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'job_applicants',
        action: 'status_change',
        before: { status: 'new' },
        after: { status: 'reviewing' },
      }),
    );
  });

  it('changeStatus rejects a skipped step (new → accepted) with 409', async () => {
    const { service, applicants, audit } = setup();
    applicants.findById.mockResolvedValue(applicant({ status: 'new' }));
    await expect(
      service.changeStatus({ id: APPLICANT_ID, to: 'accepted', actorId: ACTOR }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(applicants.moveStatus).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('changeStatus 409s when the compare-and-set misses', async () => {
    const { service, applicants } = setup();
    applicants.findById.mockResolvedValue(applicant({ status: 'new' }));
    applicants.moveStatus.mockResolvedValue(null);
    await expect(
      service.changeStatus({ id: APPLICANT_ID, to: 'reviewing', actorId: ACTOR }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('remove audits the snapshot before deleting', async () => {
    const { service, applicants, audit } = setup();
    applicants.findById.mockResolvedValue(applicant());
    await service.remove({ id: APPLICANT_ID, actorId: ACTOR });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'delete', before: applicant() }),
    );
    expect(applicants.remove).toHaveBeenCalledWith(APPLICANT_ID);
  });

  it('list echoes paging', async () => {
    const { service, applicants } = setup();
    applicants.list.mockResolvedValue({ items: [], total: 0 });
    await expect(service.list({ page: 1, pageSize: 25 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
  });
});
