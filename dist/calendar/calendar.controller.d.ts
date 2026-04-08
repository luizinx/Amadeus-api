import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    webhook(channelId: string, resourceState: string, userEmail: string): Promise<void>;
    watch(req: any, webhookUrl: string): Promise<{
        message: string;
        channel: any;
    }>;
    getEvents(req: any, maxResults?: string): Promise<{
        email: any;
        total: number;
        events: import("googleapis").calendar_v3.Schema$Event[];
    }>;
    createEvent(req: any, body: {
        summary: string;
        description?: string;
        location?: string;
        start: string;
        end: string;
        attendees?: string[];
    }): Promise<{
        email: any;
        event: import("googleapis").calendar_v3.Schema$Event;
    }>;
    getEvent(req: any, eventId: string): Promise<{
        email: any;
        event: import("googleapis").calendar_v3.Schema$Event;
    }>;
}
