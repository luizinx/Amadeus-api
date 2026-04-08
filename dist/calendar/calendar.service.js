"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const users_service_1 = require("../users/users.service");
let CalendarService = CalendarService_1 = class CalendarService {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(CalendarService_1.name);
        this.syncTokens = new Map();
    }
    getOAuthClient(user) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL);
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
        });
        return oauth2Client;
    }
    async getUpcomingEvents(user, maxResults = 10) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        const events = response.data.items || [];
        for (const event of events) {
            this.logger.log(`[EVENTO] Usuário: ${user.email} | Título: ${event.summary || '(sem título)'} | Início: ${event.start?.dateTime || event.start?.date} | ID: ${event.id}`);
        }
        if (events.length === 0) {
            this.logger.log(`[EVENTOS] Nenhum evento futuro encontrado para: ${user.email}`);
        }
        return events;
    }
    async createEvent(user, body) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
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
    async getEventById(user, eventId) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const response = await calendar.events.get({
            calendarId: 'primary',
            eventId,
        });
        const event = response.data;
        this.logEventDetails('[EVENTO ÚNICO]', user.email, event);
        return event;
    }
    async watchCalendar(user, webhookUrl) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const channelId = `amadeus-${user.id}-${Date.now()}`;
        const response = await calendar.events.watch({
            calendarId: 'primary',
            requestBody: {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                token: user.email,
                expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        this.logger.log(`[WATCH] Webhook registrado para ${user.email} | Channel: ${channelId} | Expira: ${new Date(Number(response.data.expiration)).toISOString()}`);
        await this.refreshSyncToken(user);
        return response.data;
    }
    async handleWebhookNotification(channelId, resourceState, userEmail) {
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
    async fetchChangedEvents(user) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const syncToken = this.syncTokens.get(user.email);
        try {
            const response = await calendar.events.list({
                calendarId: 'primary',
                syncToken,
                showDeleted: true,
            });
            if (response.data.nextSyncToken) {
                this.syncTokens.set(user.email, response.data.nextSyncToken);
            }
            return response.data.items || [];
        }
        catch (err) {
            if (err?.code === 410) {
                this.logger.warn(`[WEBHOOK] syncToken expirado para ${user.email}, fazendo full sync...`);
                await this.refreshSyncToken(user);
                return [];
            }
            throw err;
        }
    }
    async refreshSyncToken(user) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
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
    logEventDetails(label, email, event) {
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
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map