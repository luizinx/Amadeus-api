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
var AgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const https = require("https");
const http = require("http");
let AgentService = AgentService_1 = class AgentService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(AgentService_1.name);
        this.conversations = new Map();
    }
    async sendToAgent(event, email) {
        const agentUrl = this.config.get('AGENT_URL');
        if (!agentUrl) {
            this.logger.warn('[AGENTE] AGENT_URL não configurada no .env — pulando envio');
            return;
        }
        const payload = {
            eventId: event.id,
            email,
            message: `Ola! Detectei um novo evento na sua agenda: "${event.summary}" em ${event.location}. Posso te ajudar com sugestoes para essa viagem!`,
            evento: {
                summary: event.summary,
                description: event.description || null,
                location: event.location,
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                organizer: event.organizer?.email,
                attendees: event.attendees?.map((a) => a.email) || [],
                status: event.status,
                created: event.created,
                updated: event.updated,
            },
        };
        this.logger.log(`[AGENTE] Enviando evento "${event.summary}" (${event.id}) de ${email} para o agente...`);
        this.logger.log(`[AGENTE] Local: ${event.location}`);
        this.postJson(agentUrl, payload).catch((err) => {
            this.logger.error(`[AGENTE] Falha ao enviar para ${agentUrl}: ${err.message}`);
        });
    }
    storeCallback(body) {
        const entry = {
            conversationId: body.conversationId,
            email: body.email,
            receivedAt: new Date().toISOString(),
            payload: body,
        };
        this.conversations.set(body.conversationId, entry);
        this.logger.log('='.repeat(60));
        this.logger.log(`[AGENTE CALLBACK] Resposta recebida`);
        this.logger.log(`  conversationId : ${body.conversationId}`);
        this.logger.log(`  email          : ${body.email}`);
        this.logger.log(`  payload        : ${JSON.stringify(body, null, 2)}`);
        this.logger.log('='.repeat(60));
    }
    getAllConversations() {
        return Array.from(this.conversations.values()).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    }
    getConversation(conversationId) {
        return this.conversations.get(conversationId) ?? null;
    }
    getConversationsByEmail(email) {
        return Array.from(this.conversations.values()).filter((c) => c.email === email);
    }
    postJson(url, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const parsed = new URL(url);
            const lib = parsed.protocol === 'https:' ? https : http;
            const req = lib.request({
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            }, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
};
exports.AgentService = AgentService;
exports.AgentService = AgentService = AgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AgentService);
//# sourceMappingURL=agent.service.js.map