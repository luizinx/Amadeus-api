import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(AuthGuard('jwt'))
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getEvents(
    @Request() req,
    @Query('maxResults') maxResults?: string,
  ) {
    const events = await this.calendarService.getUpcomingEvents(
      req.user,
      maxResults ? parseInt(maxResults, 10) : 10,
    );
    return { email: req.user.email, total: events.length, events };
  }

  @Get('events/:eventId')
  async getEvent(@Request() req, @Param('eventId') eventId: string) {
    const event = await this.calendarService.getEventById(req.user, eventId);
    return { email: req.user.email, event };
  }
}
