import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Redireciona para o Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req, @Res() res) {
    const token = this.authService.generateToken(req.user);
    // Redireciona com o token JWT na query string (ajuste conforme seu frontend)
    return res.redirect(`/auth/success?token=${token.access_token}`);
  }

  @Get('success')
  success(@Req() req) {
    return { message: 'Autenticado com sucesso. Use o token Bearer nas próximas requisições.', token: req.query.token };
  }
}
