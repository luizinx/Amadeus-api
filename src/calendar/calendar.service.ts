import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  // Armazena o syncToken por usuário para buscar apenas eventos alterados
  private syncTokens = new Map<string, string>();

  constructor(private readonly usersService: UsersService) {}

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

  async createEvent(
    user: User,
    body: {
      summary: string;
      description?: string;
      location?: string;
      start: string;
      end: string;
      attendees?: string[];
    },
  ): Promise<calendar_v3.Schema$Event> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: body.summary,
        description: body.description,
        location: body.location,
        start: { dateTime: body.start, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: body.end, timeZone: 'America/Sao_Paulo' },
        attendees: body.attendees?.map((email) => ({ email })),
      },
    });

    const event = response.data;
    this.logEventDetails('[EVENTO CRIADO]', user.email, event);
    return event;
  }

  async getEventById(user: User, eventId: string): Promise<calendar_v3.Schema$Event> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    const event = response.data;
    this.logEventDetails('[EVENTO ÚNICO]', user.email, event);
    return event;
  }

  // Registra o webhook no Google Calendar para um usuário
  async watchCalendar(user: User, webhookUrl: string): Promise<any> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const channelId = `amadeus-${user.id}-${Date.now()}`;

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: user.email, // enviado de volta pelo Google em cada notificação
        // Expira em 7 dias (máximo permitido pelo Google)
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`[WATCH] Webhook registrado para ${user.email} | Channel: ${channelId} | Expira: ${new Date(Number(response.data.expiration)).toISOString()}`);

    // Salva o syncToken inicial para buscar apenas eventos novos/alterados depois
    await this.refreshSyncToken(user);

    return response.data;
  }

  // Chamado quando o Google envia notificação de mudança no calendário
  async handleWebhookNotification(
    channelId: string,
    resourceState: string,
    userEmail: string,
  ): Promise<void> {
    // Google envia "sync" na primeira notificação — ignorar
    if (resourceState === 'sync') {
      this.logger.log(`[WEBHOOK] Confirmação de canal recebida para ${userEmail}`);
      return;
    }

    const user = await this.usersService.findByEmail(userEmail);
    if (!user) {
      this.logger.warn(`[WEBHOOK] Usuário não encontrado: ${userEmail}`);
      return;
    }

    this.logger.log(`[WEBHOOK] Mudança detectada na agenda de ${userEmail} — buscando eventos alterados...`);

    const changedEvents = await this.fetchChangedEvents(user);

    if (changedEvents.length === 0) {
      this.logger.log(`[WEBHOOK] Nenhum evento novo/alterado encontrado para ${userEmail}`);
      return;
    }

    for (const event of changedEvents) {
      const label = event.status === 'cancelled' ? '[EVENTO CANCELADO]' : '[EVENTO ALTERADO/CRIADO]';
      this.logEventDetails(label, userEmail, event);
    }
  }

  // Busca apenas eventos alterados desde o último syncToken
  private async fetchChangedEvents(user: User): Promise<calendar_v3.Schema$Event[]> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const syncToken = this.syncTokens.get(user.email);

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        syncToken,
        showDeleted: true,
      });

      // Atualiza o syncToken para a próxima chamada
      if (response.data.nextSyncToken) {
        this.syncTokens.set(user.email, response.data.nextSyncToken);
      }

      return response.data.items || [];
    } catch (err: any) {
      // syncToken expirado — faz full sync
      if (err?.code === 410) {
        this.logger.warn(`[WEBHOOK] syncToken expirado para ${user.email}, fazendo full sync...`);
        await this.refreshSyncToken(user);
        return [];
      }
      throw err;
    }
  }

  // Faz uma listagem completa só para capturar o syncToken atual
  private async refreshSyncToken(user: User): Promise<void> {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: new Date().toISOString(),
    });

    if (response.data.nextSyncToken) {
      this.syncTokens.set(user.email, response.data.nextSyncToken);
    }
  }

  private logEventDetails(label: string, email: string, event: calendar_v3.Schema$Event) {
    this.logger.log('='.repeat(60));
    this.logger.log(label);
    this.logger.log(`  Usuario      : ${email}`);
    this.logger.log(`  ID           : ${event.id}`);
    this.logger.log(`  Titulo       : ${event.summary || '(sem titulo)'}`);
    this.logger.log(`  Descricao    : ${event.description || '-'}`);
    this.logger.log(`  Local        : ${event.location || '-'}`);
    this.logger.log(`  Inicio       : ${event.start?.dateTime || event.start?.date || '-'}`);
    this.logger.log(`  Fim          : ${event.end?.dateTime || event.end?.date || '-'}`);
    this.logger.log(`  Participantes: ${event.attendees?.map((a) => a.email).join(', ') || '-'}`);
    this.logger.log(`  Organizador  : ${event.organizer?.email || '-'}`);
    this.logger.log(`  Status       : ${event.status || '-'}`);
    this.logger.log(`  Link         : ${event.htmlLink || '-'}`);
    this.logger.log(`  Criado em    : ${event.created || '-'}`);
    this.logger.log(`  Atualizado   : ${event.updated || '-'}`);
    this.logger.log('='.repeat(60));
  }
}
