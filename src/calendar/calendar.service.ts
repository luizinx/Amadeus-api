import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { User } from '../users/user.entity';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  private getOAuthClient(user: User) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );

    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });

    return oauth2Client;
  }

  async getUpcomingEvents(user: User, maxResults = 10): Promise<calendar_v3.Schema$Event[]> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Loga email + cada evento recebido
    for (const event of events) {
      this.logger.log(
        `[EVENTO] Usuário: ${user.email} | Título: ${event.summary || '(sem título)'} | Início: ${event.start?.dateTime || event.start?.date} | ID: ${event.id}`,
      );
    }

    if (events.length === 0) {
      this.logger.log(`[EVENTOS] Nenhum evento futuro encontrado para: ${user.email}`);
    }

    return events;
  }

  async getEventById(user: User, eventId: string): Promise<calendar_v3.Schema$Event> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    const event = response.data;

    this.logger.log(
      `[EVENTO ÚNICO] Usuário: ${user.email} | Título: ${event.summary || '(sem título)'} | Início: ${event.start?.dateTime || event.start?.date} | ID: ${event.id}`,
    );

    return event;
  }
}
