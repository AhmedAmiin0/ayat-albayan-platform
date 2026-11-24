import type { StudentState } from '@/modules/finance/subscriptions/money/packages.service';
import type { RenewalCause } from '@/modules/finance/subscriptions/student-lifecycle/student-renewal';
import type { StudentTz } from '@/modules/finance/subscriptions/student-lifecycle/student-status.types';

export interface Recipient {
  studentName: string;
  guardianId: string;
  phone: string;
}

export interface OpenTask {
  subject_id: string;
  dedup_key: string;
}

export interface RenewalMessage {
  recipient: Recipient;
  params: Record<string, string>;
  dedupKey: string;
  now: Date;
}

export interface EvaluateOptions {
  actorId?: string | null;
  now?: Date;
  cause?: RenewalCause;
}

export interface Run {
  actorId: string | null;
  now: Date;
  cause: RenewalCause;
  threshold: number;
  auto: boolean;
}

export interface Subject {
  studentId: string;
  student: StudentTz | undefined;
  state: StudentState;
}

export interface Outcome {
  subjectIds: string[];
  keep: string[];
}
