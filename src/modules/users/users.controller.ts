import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permission } from '../../common/enums/permission.enum';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(Permission.USERS_MANAGE)
  @ApiOkResponse({ description: 'Usuários listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Post()
  @Permissions(Permission.USERS_MANAGE)
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put('me')
  @ApiBody({ type: UpdateOwnProfileDto })
  @ApiOkResponse({ description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOwnProfileDto,
  ) {
    return this.usersService.updateOwnProfile(user, dto);
  }

  @Put(':id')
  @Permissions(Permission.USERS_MANAGE)
  @ApiBody({ type: UpdateUserByAdminDto })
  @ApiOkResponse({ description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  updateByAdmin(@Param('id') id: string, @Body() dto: UpdateUserByAdminDto) {
    return this.usersService.updateByAdmin(id, dto);
  }

  @Put(':id/password')
  @Permissions(Permission.USERS_MANAGE)
  @HttpCode(200)
  @ApiBody({ type: AdminResetPasswordDto })
  @ApiOkResponse({
    schema: {
      example: { success: true },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async adminResetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ success: boolean }> {
    await this.usersService.adminResetPassword(id, dto.password);
    await this.usersService.markAllPasswordRecoveryTokensAsUsed(id);
    return { success: true };
  }
}
