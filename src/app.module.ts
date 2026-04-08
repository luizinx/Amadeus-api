import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CalendarModule } from './calendar/calendar.module';
import { AgentModule } from './agent/agent.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'db'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'amadeus'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'amadeus_db'),
        entities: [User],
        synchronize: true, // apenas dev — em prod use migrations
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CalendarModule,
    AgentModule,
  ],
})
export class AppModule {}
