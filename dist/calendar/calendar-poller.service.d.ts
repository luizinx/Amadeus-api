import { OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AgentService } from '../agent/agent.service';
export declare class CalendarPollerService implements OnModuleInit {
    private readonly usersService;
    private readonly agentService;
    private readonly logger;
    private syncTokens;
    constructor(usersService: UsersService, agentService: AgentService);
    onModuleInit(): Promise<void>;
    pollAllUsers(): Promise<void>;
    private checkForChanges;
    private logEvent;
    private initSyncToken;
    private getOAuthClient;
}
