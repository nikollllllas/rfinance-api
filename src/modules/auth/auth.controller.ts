import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AUTH_COOKIE_NAME, authCookieOptions, tokenFromCookieHeader } from './auth-cookie';
import { AuthService } from './auth.service';
import { ForgotPasswordResponseDto, LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login realizado com sucesso', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.authService.login(dto);
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(201)
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'Conta criada e sessão iniciada', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.authService.register(dto);
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Solicitação de recuperação recebida',
    type: ForgotPasswordResponseDto,
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Token de recuperação inválido ou expirado' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<SuccessResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SuccessResponseDto })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto> {
    await this.authService.logout(tokenFromCookieHeader(req.headers.cookie));
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Dados do usuário autenticado', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return { user: await this.authService.me(user.userId) };
  }
}
