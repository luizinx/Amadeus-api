import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarPollerService } from './calendar-poller.service';
import { UsersModule } from '../users/users.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [ScheduleModule.forRoot(), UsersModule, AgentModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarPollerService],
})
export class CalendarModule {}
