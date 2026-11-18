import type {
  EventRef,
  GoogleEvent,
  GoogleEventBody,
  GoogleListedEvent,
} from '@/modules/platform/google-sync/google-client.port';
import {
  calendarPageAnswer,
  createdAnswer,
  eventAnswer,
  eventsAnswer,
  ignoredAnswer,
} from './google-answers';
import type { GoogleHttp } from './google-http';

const enc = encodeURIComponent;
/** Never email the guests. */
const NO_UPDATES = { sendUpdates: 'none' };

interface NewEvent {
  calendarId: string;
  event: GoogleEventBody;
}

interface Calendar {
  id: string;
  summary: string;
}

/** Calendar v3: calendarList (discovery) and the events of one calendar. */
export class CalendarApi {
  constructor(private readonly http: GoogleHttp) {}

  private events(calendarId: string): string {
    return `${this.http.endpoints.api}/calendar/v3/calendars/${enc(calendarId)}/events`;
  }

  private event(ref: EventRef): string {
    return `${this.events(ref.calendarId)}/${enc(ref.eventId)}`;
  }

  private calendarPage(pageToken: string | undefined) {
    return this.http.send({
      path: `${this.http.endpoints.api}/calendar/v3/users/me/calendarList`,
      query: { maxResults: '250', pageToken },
      schema: calendarPageAnswer,
    });
  }

  async listCalendars(): Promise<Calendar[]> {
    const out: Calendar[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.calendarPage(pageToken);
      out.push(...(page.items ?? []).map((c) => ({ id: c.id, summary: c.summary ?? c.id })));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return out;
  }

  getEvent(ref: EventRef): Promise<GoogleEvent | null> {
    return this.http.maybe({ path: this.event(ref), schema: eventAnswer });
  }

  /** One page is enough: the guard asks for a one-minute range of one calendar. */
  async listEvents(input: {
    calendarId: string;
    timeMin: string;
    timeMax: string;
  }): Promise<GoogleListedEvent[]> {
    const { timeMin, timeMax } = input;
    const query = { timeMin, timeMax, singleEvents: 'true', maxResults: '250' };
    const path = this.events(input.calendarId);
    const page = await this.http.send({ path, query, schema: eventsAnswer });
    return page.items ?? [];
  }

  async insertEvent(input: NewEvent): Promise<{ id: string }> {
    const path = this.events(input.calendarId);
    const json = input.event;
    const { id } = await this.http.send({
      method: 'POST',
      path,
      json,
      query: NO_UPDATES,
      schema: createdAnswer,
    });
    return { id };
  }

  async updateEvent(input: EventRef & { event: GoogleEventBody }): Promise<void> {
    const path = this.event(input);
    const json = input.event;
    await this.http.send({ method: 'PUT', path, json, query: NO_UPDATES, schema: ignoredAnswer });
  }

  async deleteEvent(ref: EventRef): Promise<void> {
    const path = this.event(ref);
    await this.http.send({ method: 'DELETE', path, query: NO_UPDATES, schema: ignoredAnswer });
  }
}
