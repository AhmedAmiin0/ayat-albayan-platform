import { lessonRatingMessage, RATING_TEMPLATE } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { Outbox, type Sent } from '../../messaging/inbox/send/outbox';
import { waHttpError } from '../../messaging/whatsapp/templates/catalog/template.mapper';
import { TemplateRegistry } from '../../messaging/whatsapp/templates/catalog/template.registry';
import { ratingFamilies } from './rating.plan';
import { RatingQueries } from './rating.queries';

export interface RatingSend {
  phone: string;
  actorId: string;
  clientRequestId: string;
}

/**
 * POST /threads/:phone/rating «إرسال تقييم الحلقة»: the admin asks a guardian to rate their
 * children's latest lesson that took place — the way to reopen a closed chat with a question they
 * answer by one tap. An admin send (created_by = admin): the automatic-messages switch does not
 * hold it; the send gate still does. Its own dedup key per request id (rule 8), so it never
 * replays the job's automatic row for the same lesson.
 */
@Injectable()
export class RatingSendService {
  constructor(
    private readonly queries: RatingQueries,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  async send(input: RatingSend, now = new Date()): Promise<Sent> {
    if (!(await this.templates.approved(RATING_TEMPLATE))) throw waHttpError('template_not_approved', 409);
    const guardian = await this.queries.guardianByPhone(input.phone);
    if (!guardian) throw waHttpError('not_a_guardian', 404);
    const lesson = await this.queries.latestHeld({ guardianId: guardian.id, now });
    const family = lesson ? ratingFamilies(lesson).find((f) => f.guardian.id === guardian.id) : undefined;
    if (!lesson || !family) throw waHttpError('no_completed_lesson', 404);
    const { key, params } = lessonRatingMessage({
      lessonId: lesson.id,
      studentNames: family.names,
      startsAt: new Date(lesson.starts_at),
      tz: guardian.tz,
    });
    return this.outbox.send({
      phone_e164: input.phone,
      guardian_id: guardian.id,
      lesson_id: lesson.id,
      template_key: key,
      template_params: { '1': params['1'] ?? '', '2': params['2'] ?? '', payloads: params.payloads ?? [] },
      dedup_key: `admin:${input.phone}:rating:${input.clientRequestId}`,
      created_by: input.actorId,
    });
  }
}
