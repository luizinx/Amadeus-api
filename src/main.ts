import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  app.enableCors();

  const logger = new Logger('Bootstrap');
  await app.listen(port);
  logger.log(`Aplicação rodando em: http://localhost:${port}`);
  logger.log(`Login Google OAuth: http://localhost:${port}/auth/google`);
  logger.log(`Eventos do calendário: http://localhost:${port}/calendar/events (requer Bearer token)`);
}

bootstrap();
