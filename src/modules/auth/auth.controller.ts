import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
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
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        accessToken: 'jwt.token.value',
        user: {
          id: 'uuid',
          name: 'Administrador',
          email: 'admin@rfinance.local',
          role: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Solicitação de recuperação recebida',
    schema: {
      example: {
        message:
          'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.',
      },
    },
  })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token de recuperação inválido ou expirado' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean }> {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
      },
    },
  })
  logout(): { success: boolean } {
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Dados do usuário autenticado',
    schema: {
      example: {
        user: {
          id: 'uuid',
          name: 'Administrador',
          email: 'admin@rfinance.local',
          role: 'ADMIN',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ user: { id: string; name: string; email: string; role: string } }> {
    return { user: await this.authService.me(user.userId) };
  }
}
