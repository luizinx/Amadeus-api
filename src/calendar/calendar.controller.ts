import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // Webhook do Google — sem autenticação JWT (Google chama direto)
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-resource-state') resourceState: string,
    @Headers('x-goog-channel-token') userEmail: string,
  ) {
    await this.calendarService.handleWebhookNotification(channelId, resourceState, userEmail);
    return;
  }

  // Rotas protegidas por JWT
  @Post('watch')
  @UseGuards(AuthGuard('jwt'))
  async watch(@Request() req, @Body('webhookUrl') webhookUrl: string) {
    const result = await this.calendarService.watchCalendar(req.user, webhookUrl);
    return { message: 'Webhook registrado com sucesso', channel: result };
  }

  @Get('events')
  @UseGuards(AuthGuard('jwt'))
  async getEvents(@Request() req, @Query('maxResults') maxResults?: string) {
    const events = await this.calendarService.getUpcomingEvents(
      req.user,
      maxResults ? parseInt(maxResults, 10) : 10,
    );
    return { email: req.user.email, total: events.length, events };
  }

  @Post('events')
  @UseGuards(AuthGuard('jwt'))
  async createEvent(
    @Request() req,
    @Body() body: {
      summary: string;
      description?: string;
      location?: string;
      start: string;
      end: string;
      attendees?: string[];
    },
  ) {
    const event = await this.calendarService.createEvent(req.user, body);
    return { email: req.user.email, event };
  }

  @Get('events/:eventId')
  @UseGuards(AuthGuard('jwt'))
  async getEvent(@Request() req, @Param('eventId') eventId: string) {
    const event = await this.calendarService.getEventById(req.user, eventId);
    return { email: req.user.email, event };
  }
}
