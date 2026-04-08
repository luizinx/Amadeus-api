import { ConfigService } from '@nestjs/config';
import { calendar_v3 } from 'googleapis';
export interface AgentCallback {
    conversationId: string;
    email: string;
    receivedAt: string;
    payload: any;
}
export declare class AgentService {
    private readonly config;
    private readonly logger;
    private readonly conversations;
    constructor(config: ConfigService);
    sendToAgent(event: calendar_v3.Schema$Event, email: string): Promise<void>;
    storeCallback(body: {
        conversationId: string;
        email: string;
        [key: string]: any;
    }): void;
    getAllConversations(): AgentCallback[];
    getConversation(conversationId: string): AgentCallback | null;
    getConversationsByEmail(email: string): AgentCallback[];
    private postJson;
}
