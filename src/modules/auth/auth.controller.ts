import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordResponseDto, LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
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
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
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

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({ type: SuccessResponseDto })
  logout(): SuccessResponseDto {
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
