import { bookingConfirmationTemplate, joinNames, lessonWhenText, type BookingTemplateKey } from '@ab/shared';

/** A booked student's guardian; id null = the guardian the RPC creates or reuses (lead path). */
export type BookedGuardian = { id: string | null; phone_e164: string; tz: string };
export type BookedStudent = { name: string; guardian: BookedGuardian };

/** One queued messages row before the RPC fills lesson_id, dedup_key and a null guardian_id. */
export type MessageDraft = {
  guardian_id: string | null;
  phone_e164: string;
  template_key: BookingTemplateKey;
  template_params: Record<string, string>;
};

export type DraftInput = {
  students: readonly BookedStudent[];
  firstStart: Date;
  meetingLink: string | null;
};

/**
 * One booking_confirmation* per distinct guardian (docs/10 §5.11, R-SCH-06, R-LES-02): the
 * template follows the lesson's link (Jitsi / Meet / none), {{1}} = that guardian's booked
 * children («سهيلة ومريم», the engine's joinNames), {{2}} = the first lesson in the guardian's
 * tz, button = code/slug.
 * TODO(R-MSG-01): owner to confirm {{1}} is the student's name, not the guardian's.
 */
export function confirmationDrafts(input: DraftInput): MessageDraft[] {
  const template = bookingConfirmationTemplate(input.meetingLink);
  const byPhone = new Map<string, { guardian: BookedGuardian; names: string[] }>();
  for (const s of input.students) {
    const entry = byPhone.get(s.guardian.phone_e164) ?? { guardian: s.guardian, names: [] };
    entry.names.push(s.name);
    byPhone.set(s.guardian.phone_e164, entry);
  }
  return [...byPhone.values()].map(({ guardian, names }) => ({
    guardian_id: guardian.id,
    phone_e164: guardian.phone_e164,
    template_key: template.key,
    template_params: {
      '1': joinNames(names),
      '2': lessonWhenText(input.firstStart, guardian.tz),
      ...(template.button ? { button: template.button } : {}),
    },
  }));
}
