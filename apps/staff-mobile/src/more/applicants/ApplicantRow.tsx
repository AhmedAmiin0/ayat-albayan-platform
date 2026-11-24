import { formatPhone } from '@ab/core';
import { jobApplicantStatusStyle } from '@ab/money';
import { memo } from 'react';
import { t, ListRow, ltr, StatusChip } from '@ab/mobile-kit';
import type { JobApplicant } from '@/core/lib/staff/types';
import { ApplicantLinks } from './ApplicantLinks';

/** One applicant: name + LTR phone, the CV / recitation links, the status. Not a button (the web moves them). */
export const ApplicantRow = memo(function ApplicantRow({ applicant }: { applicant: JobApplicant }) {
  const phone = formatPhone(applicant.phone_e164);
  return (
    <ListRow
      title={applicant.name ?? ltr(phone)}
      meta={applicant.name ? phone : undefined}
      tags={<ApplicantLinks cv={applicant.cv_url} recitation={applicant.recitation_url} />}
      trailing={<StatusChip {...jobApplicantStatusStyle[applicant.status]} label={t.enums.jobApplicantStatus[applicant.status]} />}
    />
  );
});
