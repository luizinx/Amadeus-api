import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google, calendar_v3 } from 'googleapis';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { AgentService } from '../agent/agent.service';

const IGNORED_LOCATIONS = ['google meet', 'meet', ''];

function isRealLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  return !IGNORED_LOCATIONS.includes(location.toLowerCase().trim());
}

// Mapa de timezone → cidade/região
const TIMEZONE_CITY: Record<string, string> = {
  'America/Sao_Paulo':      'São Paulo, BR',
  'America/Manaus':         'Manaus, BR',
  'America/Belem':          'Belém, BR',
  'America/Fortaleza':      'Fortaleza, BR',
  'America/Recife':         'Recife, BR',
  'America/Bahia':          'Salvador, BR',
  'America/Cuiaba':         'Cuiabá, BR',
  'America/Porto_Velho':    'Porto Velho, BR',
  'America/Rio_Branco':     'Rio Branco, BR',
  'America/Boa_Vista':      'Boa Vista, BR',
  'America/New_York':       'Nova York, EUA',
  'America/Chicago':        'Chicago, EUA',
  'America/Denver':         'Denver, EUA',
  'America/Los_Angeles':    'Los Angeles, EUA',
  'America/Buenos_Aires':   'Buenos Aires, AR',
  'America/Argentina/Buenos_Aires': 'Buenos Aires, AR',
  'America/Santiago':       'Santiago, CL',
  'America/Bogota':         'Bogotá, CO',
  'America/Lima':           'Lima, PE',
  'America/Mexico_City':    'Cidade do México, MX',
  'Europe/London':          'Londres, UK',
  'Europe/Paris':           'Paris, FR',
  'Europe/Berlin':          'Berlim, DE',
  'Europe/Madrid':          'Madri, ES',
  'Europe/Lisbon':          'Lisboa, PT',
  'Europe/Rome':            'Roma, IT',
  'Europe/Amsterdam':       'Amsterdã, NL',
  'Asia/Tokyo':             'Tóquio, JP',
  'Asia/Shanghai':          'Xangai, CN',
  'Asia/Kolkata':           'Mumbai, IN',
  'Asia/Dubai':             'Dubai, AE',
  'Australia/Sydney':       'Sydney, AU',
  'Pacific/Auckland':       'Auckland, NZ',
  'Africa/Johannesburg':    'Joanesburgo, ZA',
};

function resolveLocation(timezone: string | undefined | null): string {
  if (!timezone) return 'Localização desconhecida';
  return TIMEZONE_CITY[timezone] ?? `Fuso: ${timezone}`;
}

@Injectable()
export class CalendarPollerService implements OnModuleInit {
  private readonly logger = new Logger(CalendarPollerService.name);
  private syncTokens = new Map<string, string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly agentService: AgentService,
  ) {}

  async onModuleInit() {
    // Inicializa os syncTokens de todos os usuários já cadastrados ao subir
    const users = await this.usersService.findAll();
    for (const user of users) {
      await this.initSyncToken(user);
    }
    this.logger.log(`[POLL] Monitorando ${users.length} usuario(s) — verificando a cada 1 minuto`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollAllUsers() {
    const users = await this.usersService.findAll();

    for (const user of users) {
      // Usuário novo sem syncToken ainda — inicializa sem logar
      if (!this.syncTokens.has(user.email)) {
        await this.initSyncToken(user);
        continue;
      }

      try {
        await this.checkForChanges(user);
      } catch (err) {
        this.logger.error(`[POLL] Erro ao verificar agenda de ${user.email}: ${(err as any).message}`);
      }
    }
  }

  private async checkForChanges(user: User) {
    const auth = this.getOAuthClient(user);
    const calendar = google.calendar({ version: 'v3', auth });
    const syncToken = this.syncTokens.get(user.email);

    let response: any;
    try {
      response = await calendar.events.list({
        calendarId: 'primary',
        syncToken,
        showDeleted: true,
      });
    } catch (err: any) {
      if (err?.code === 410) {
        this.logger.warn(`[POLL] syncToken expirado para ${user.email} — reiniciando...`);
        await this.initSyncToken(user);
        return;
      }
      throw err;
    }

    const events: calendar_v3.Schema$Event[] = response.data.items || [];

    if (response.data.nextSyncToken) {
      this.syncTokens.set(user.email, response.data.nextSyncToken);
    }

    for (const event of events) {
      if (event.status === 'cancelled') {
        this.logger.log(`[POLL] Evento CANCELADO | Usuario: ${user.email} | ID: ${event.id}`);
        continue;
      }

      this.logEvent(user.email, event);

      // Dispara o agente se o local for um endereço real (não nulo, não Google Meet)
      if (isRealLocation(event.location)) {
        this.logger.log(`[AGENTE] Local real detectado: "${event.location}" — disparando agente...`);
        await this.agentService.sendToAgent(event, user.email);
      }
    }
  }

  private logEvent(email: string, event: calendar_v3.Schema$Event) {
    // Tenta pegar o timezone do criador via start.timeZone ou attendees
    const creatorTimezone =
      event.start?.timeZone ||
      event.organizer?.['timeZone'] ||
      null;

    const origem = resolveLocation(creatorTimezone);

    this.logger.log('='.repeat(60));
    this.logger.log(`[POLL] NOVO/ALTERADO EVENTO DETECTADO`);
    this.logger.log(`  Usuario      : ${email}`);
    this.logger.log(`  ID           : ${event.id}`);
    this.logger.log(`  Titulo       : ${event.summary || '(sem titulo)'}`);
    this.logger.log(`  Descricao    : ${event.description || '-'}`);
    this.logger.log(`  Local evento : ${event.location || '-'}`);
    this.logger.log(`  Inicio       : ${event.start?.dateTime || event.start?.date || '-'}`);
    this.logger.log(`  Fim          : ${event.end?.dateTime || event.end?.date || '-'}`);
    this.logger.log(`  Organizador  : ${event.organizer?.email || '-'}`);
    this.logger.log(`  Participantes: ${event.attendees?.map((a) => a.email).join(', ') || '-'}`);
    this.logger.log(`  Status       : ${event.status}`);
    this.logger.log(`  Criado em    : ${event.created}`);
    this.logger.log(`  Atualizado   : ${event.updated}`);
    this.logger.log(`  Origem (tz)  : ${origem}`);
    this.logger.log('='.repeat(60));
  }

  private async initSyncToken(user: User) {
    try {
      const auth = this.getOAuthClient(user);
      const calendar = google.calendar({ version: 'v3', auth });

      // Lista mínima só para capturar o nextSyncToken atual
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
    } catch (err) {
      this.logger.warn(`[POLL] Nao foi possivel inicializar syncToken para ${user.email}: ${(err as any).message}`);
    }
  }

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
}
