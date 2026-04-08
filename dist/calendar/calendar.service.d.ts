import { calendar_v3 } from 'googleapis';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
export declare class CalendarService {
    private readonly usersService;
    private readonly logger;
    private syncTokens;
    constructor(usersService: UsersService);
    private getOAuthClient;
    getUpcomingEvents(user: User, maxResults?: number): Promise<calendar_v3.Schema$Event[]>;
    createEvent(user: User, body: {
        summary: string;
        description?: string;
        location?: string;
        start: string;
        end: string;
        attendees?: string[];
    }): Promise<calendar_v3.Schema$Event>;
    getEventById(user: User, eventId: string): Promise<calendar_v3.Schema$Event>;
    watchCalendar(user: User, webhookUrl: string): Promise<any>;
    handleWebhookNotification(channelId: string, resourceState: string, userEmail: string): Promise<void>;
    private fetchChangedEvents;
    private refreshSyncToken;
    private logEventDetails;
}
