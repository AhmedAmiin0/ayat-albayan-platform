import type { EventRef, GoogleEvent, GoogleEventBody, GoogleListedEvent } from '../google-client.port';
import type { GoogleHttp } from './google-http';

const enc = encodeURIComponent;

/** Calendar v3: calendarList (discovery) and the events of one calendar. */
export class CalendarApi {
  constructor(private readonly http: GoogleHttp) {}

  private events(calendarId: string): string {
    return `${this.http.endpoints.api}/calendar/v3/calendars/${enc(calendarId)}/events`;
  }

  async listCalendars(): Promise<{ id: string; summary: string }[]> {
    const out: { id: string; summary: string }[] = [];
    let pageToken: string | undefined;
    do {
      const query: Record<string, string> = { maxResults: '250', ...(pageToken ? { pageToken } : {}) };
      const page = await this.http.send<{ items?: { id: string; summary?: string }[]; nextPageToken?: string }>({
        method: 'GET',
        url: `${this.http.endpoints.api}/calendar/v3/users/me/calendarList`,
        query,
      });
      for (const c of page.items ?? []) out.push({ id: c.id, summary: c.summary ?? c.id });
      pageToken = page.nextPageToken;
    } while (pageToken);
    return out;
  }

  getEvent(ref: EventRef): Promise<GoogleEvent | null> {
    return this.http.maybe<GoogleEvent>({ method: 'GET', url: `${this.events(ref.calendarId)}/${enc(ref.eventId)}` });
  }

  /** One page is enough: the guard asks for a one-minute range of one calendar. */
  async listEvents(input: { calendarId: string; timeMin: string; timeMax: string }): Promise<GoogleListedEvent[]> {
    const query = { timeMin: input.timeMin, timeMax: input.timeMax, singleEvents: 'true', maxResults: '250' };
    const page = await this.http.send<{ items?: GoogleListedEvent[] }>({ method: 'GET', url: this.events(input.calendarId), query });
    return page.items ?? [];
  }

  insertEvent(input: { calendarId: string; event: GoogleEventBody }): Promise<{ id: string }> {
    return this.http.send<{ id: string }>({ method: 'POST', url: this.events(input.calendarId), body: input.event, query: { sendUpdates: 'none' } });
  }

  async updateEvent(input: EventRef & { event: GoogleEventBody }): Promise<void> {
    const url = `${this.events(input.calendarId)}/${enc(input.eventId)}`;
    await this.http.send({ method: 'PUT', url, body: input.event, query: { sendUpdates: 'none' } });
  }

  async deleteEvent(ref: EventRef): Promise<void> {
    await this.http.send({ method: 'DELETE', url: `${this.events(ref.calendarId)}/${enc(ref.eventId)}`, query: { sendUpdates: 'none' } });
  }
}
