"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
let CalendarService = CalendarService_1 = class CalendarService {
    constructor() {
        this.logger = new common_1.Logger(CalendarService_1.name);
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
    async getEventById(user, eventId) {
        const auth = this.getOAuthClient(user);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        const response = await calendar.events.get({
            calendarId: 'primary',
            eventId,
        });
        const event = response.data;
        this.logger.log(`[EVENTO ÚNICO] Usuário: ${user.email} | Título: ${event.summary || '(sem título)'} | Início: ${event.start?.dateTime || event.start?.date} | ID: ${event.id}`);
        return event;
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)()
], CalendarService);
//# sourceMappingURL=calendar.service.js.map