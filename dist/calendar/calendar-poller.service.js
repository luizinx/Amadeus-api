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
var CalendarPollerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarPollerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const googleapis_1 = require("googleapis");
const users_service_1 = require("../users/users.service");
const agent_service_1 = require("../agent/agent.service");
const IGNORED_LOCATIONS = ['google meet', 'meet', ''];
function isRealLocation(location) {
    if (!location)
        return false;
    return !IGNORED_LOCATIONS.includes(location.toLowerCase().trim());
}
const TIMEZONE_CITY = {
    'America/Sao_Paulo': 'São Paulo, BR',
    'America/Manaus': 'Manaus, BR',
    'America/Belem': 'Belém, BR',
    'America/Fortaleza': 'Fortaleza, BR',
    'America/Recife': 'Recife, BR',
    'America/Bahia': 'Salvador, BR',
    'America/Cuiaba': 'Cuiabá, BR',
    'America/Porto_Velho': 'Porto Velho, BR',
    'America/Rio_Branco': 'Rio Branco, BR',
    'America/Boa_Vista': 'Boa Vista, BR',
    'America/New_York': 'Nova York, EUA',
    'America/Chicago': 'Chicago, EUA',
    'America/Denver': 'Denver, EUA',
    'America/Los_Angeles': 'Los Angeles, EUA',
    'America/Buenos_Aires': 'Buenos Aires, AR',
    'America/Argentina/Buenos_Aires': 'Buenos Aires, AR',
    'America/Santiago': 'Santiago, CL',
    'America/Bogota': 'Bogotá, CO',
    'America/Lima': 'Lima, PE',
    'America/Mexico_City': 'Cidade do México, MX',
    'Europe/London': 'Londres, UK',
    'Europe/Paris': 'Paris, FR',
    'Europe/Berlin': 'Berlim, DE',
    'Europe/Madrid': 'Madri, ES',
    'Europe/Lisbon': 'Lisboa, PT',
    'Europe/Rome': 'Roma, IT',
    'Europe/Amsterdam': 'Amsterdã, NL',
    'Asia/Tokyo': 'Tóquio, JP',
    'Asia/Shanghai': 'Xangai, CN',
    'Asia/Kolkata': 'Mumbai, IN',
    'Asia/Dubai': 'Dubai, AE',
    'Australia/Sydney': 'Sydney, AU',
    'Pacific/Auckland': 'Auckland, NZ',
    'Africa/Johannesburg': 'Joanesburgo, ZA',
};
function resolveLocation(timezone) {
    if (!timezone)
        return 'Localização desconhecida';
    return TIMEZONE_CITY[timezone] ?? `Fuso: ${timezone}`;
}
let CalendarPollerService = CalendarPollerService_1 = class CalendarPollerService {
    constructor(usersService, agentService) {
        this.usersService = usersService;
        this.agentService = agentService;
        this.logger = new common_1.Logger(CalendarPollerService_1.name);
        this.syncTokens = new Map();
    }
    async onModuleInit() {
        const users = await this.usersService.findAll();
        for (const user of users) {
            await this.initSyncToken(user);
        }
        this.logger.log(`[POLL] Monitorando ${users.length} usuario(s) — verificando a cada 1 minuto`);
    }
    async pollAllUsers() {
        const users = await this.usersService.findAll();
        for (const user of users) {
            if (!this.syncTokens.has(user.email)) {
                await this.initSyncToken(user);
                continue;
            }
            try {
                await this.checkForChanges(user);
            }
            catch (err) {
                this.logger.error(`[POLL] Erro ao verificar agenda de ${user.email}: ${err.message}`);
            }
        }
    }
    async checkForChanges(user) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const syncToken = this.syncTokens.get(user.email);
        let response;
        try {
            response = await calendar.events.list({
                calendarId: 'primary',
                syncToken,
                showDeleted: true,
            });
        }
        catch (err) {
            if (err?.code === 410) {
                this.logger.warn(`[POLL] syncToken expirado para ${user.email} — reiniciando...`);
                await this.initSyncToken(user);
                return;
            }
            throw err;
        }
        const events = response.data.items || [];
        if (response.data.nextSyncToken) {
            this.syncTokens.set(user.email, response.data.nextSyncToken);
        }
        for (const event of events) {
            if (event.status === 'cancelled') {
                this.logger.log(`[POLL] Evento CANCELADO | Usuario: ${user.email} | ID: ${event.id}`);
                continue;
            }
            this.logEvent(user.email, event);
            if (isRealLocation(event.location)) {
                this.logger.log(`[AGENTE] Local real detectado: "${event.location}" — disparando agente...`);
                await this.agentService.sendToAgent(event, user.email);
            }
        }
    }
    logEvent(email, event) {
        const creatorTimezone = event.start?.timeZone ||
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
    async initSyncToken(user) {
        try {
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
        catch (err) {
            this.logger.warn(`[POLL] Nao foi possivel inicializar syncToken para ${user.email}: ${err.message}`);
        }
    }
    getOAuthClient(user) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL);
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken,
        });
        return oauth2Client;
    }
};
exports.CalendarPollerService = CalendarPollerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarPollerService.prototype, "pollAllUsers", null);
exports.CalendarPollerService = CalendarPollerService = CalendarPollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        agent_service_1.AgentService])
], CalendarPollerService);
//# sourceMappingURL=calendar-poller.service.js.map