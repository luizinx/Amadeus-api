import { calendar_v3 } from 'googleapis';
import { User } from '../users/user.entity';
export declare class CalendarService {
    private readonly logger;
    private getOAuthClient;
    getUpcomingEvents(user: User, maxResults?: number): Promise<calendar_v3.Schema$Event[]>;
    getEventById(user: User, eventId: string): Promise<calendar_v3.Schema$Event>;
}
