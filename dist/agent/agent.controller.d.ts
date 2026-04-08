import { AgentService } from './agent.service';
export declare class AgentController {
    private readonly agentService;
    constructor(agentService: AgentService);
    receiveCallback(body: {
        conversationId: string;
        email: string;
        [key: string]: any;
    }): {
        received: boolean;
    };
    getConversations(email?: string): import("./agent.service").AgentCallback[];
    getConversation(conversationId: string): import("./agent.service").AgentCallback;
}
