import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getEvents(req: any, maxResults?: string): Promise<{
        email: any;
        total: number;
        events: import("googleapis").calendar_v3.Schema$Event[];
    }>;
    getEvent(req: any, eventId: string): Promise<{
        email: any;
        event: import("googleapis").calendar_v3.Schema$Event;
    }>;
}
