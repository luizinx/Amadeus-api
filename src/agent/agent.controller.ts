import { Body, Controller, Get, Param, Post, Query, UseGuards, HttpCode, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Endpoint chamado pelo agente ao terminar o processamento.
   * Não requer JWT — o agente chama diretamente.
   * Body esperado: { conversationId, email, ...qualquer dado do agente }
   */
  @Post('callback')
  @HttpCode(200)
  receiveCallback(@Body() body: { conversationId: string; email: string; [key: string]: any }) {
    this.agentService.storeCallback(body);
    return { received: true };
  }

  /**
   * Frontend busca todas as conversas processadas pelo agente.
   * Filtra por email se passado como query: GET /agent/conversations?email=x@y.com
   */
  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  getConversations(@Query('email') email?: string) {
    if (email) {
      return this.agentService.getConversationsByEmail(email);
    }
    return this.agentService.getAllConversations();
  }

  /**
   * Frontend busca o resultado de uma conversa específica.
   * GET /agent/conversations/:conversationId
   */
  @Get('conversations/:conversationId')
  @UseGuards(AuthGuard('jwt'))
  getConversation(@Param('conversationId') conversationId: string) {
    const conv = this.agentService.getConversation(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversa ${conversationId} não encontrada`);
    }
    return conv;
  }
}
