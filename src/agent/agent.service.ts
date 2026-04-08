import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3 } from 'googleapis';
import * as https from 'https';
import * as http from 'http';

export interface AgentCallback {
  conversationId: string;
  email: string;
  receivedAt: string;
  payload: any;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  // Armazena as respostas do agente em memória, indexadas por conversationId
  private readonly conversations = new Map<string, AgentCallback>();

  constructor(private readonly config: ConfigService) {}

  async sendToAgent(event: calendar_v3.Schema$Event, email: string): Promise<void> {
    const agentUrl = this.config.get<string>('AGENT_URL');

    if (!agentUrl) {
      this.logger.warn('[AGENTE] AGENT_URL não configurada no .env — pulando envio');
      return;
    }

    const payload = {
      eventId: event.id,
      email,
      message: `Ola! Detectei um novo evento na sua agenda: "${event.summary}" em ${event.location}. Posso te ajudar com sugestoes para essa viagem!`,
      evento: {
        summary:     event.summary,
        description: event.description || null,
        location:    event.location,
        start:       event.start?.dateTime || event.start?.date,
        end:         event.end?.dateTime || event.end?.date,
        organizer:   event.organizer?.email,
        attendees:   event.attendees?.map((a) => a.email) || [],
        status:      event.status,
        created:     event.created,
        updated:     event.updated,
      },
    };

    this.logger.log(`[AGENTE] Enviando evento "${event.summary}" (${event.id}) de ${email} para o agente...`);
    this.logger.log(`[AGENTE] Local: ${event.location}`);

    // Fire-and-forget — não aguarda resposta do agente
    this.postJson(agentUrl, payload).catch((err) => {
      this.logger.error(`[AGENTE] Falha ao enviar para ${agentUrl}: ${err.message}`);
    });
  }

  // Recebe o callback do agente e armazena
  storeCallback(body: { conversationId: string; email: string; [key: string]: any }): void {
    const entry: AgentCallback = {
      conversationId: body.conversationId,
      email:          body.email,
      receivedAt:     new Date().toISOString(),
      payload:        body,
    };

    this.conversations.set(body.conversationId, entry);

    this.logger.log('='.repeat(60));
    this.logger.log(`[AGENTE CALLBACK] Resposta recebida`);
    this.logger.log(`  conversationId : ${body.conversationId}`);
    this.logger.log(`  email          : ${body.email}`);
    this.logger.log(`  payload        : ${JSON.stringify(body, null, 2)}`);
    this.logger.log('='.repeat(60));
  }

  // Retorna todas as conversas (para o frontend listar)
  getAllConversations(): AgentCallback[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }

  // Retorna uma conversa específica pelo ID
  getConversation(conversationId: string): AgentCallback | null {
    return this.conversations.get(conversationId) ?? null;
  }

  // Retorna todas as conversas de um email específico
  getConversationsByEmail(email: string): AgentCallback[] {
    return Array.from(this.conversations.values()).filter((c) => c.email === email);
  }

  private postJson(url: string, body: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          hostname: parsed.hostname,
          port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path:     parsed.pathname + parsed.search,
          method:   'POST',
          headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        (res) => {
          res.resume(); // descarta o corpo — fire and forget
          resolve();
        },
      );

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}
