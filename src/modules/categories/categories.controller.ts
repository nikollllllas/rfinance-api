import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'Alimentação',
          color: '#22C55E',
          icon: 'food',
          type: 'GASTO',
          isDefault: false,
          userId: 'uuid',
        },
      ],
    },
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.list(user.userId);
  }

  @Get(':id')
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        name: 'Alimentação',
        color: '#22C55E',
        icon: 'food',
        type: 'GASTO',
        isDefault: false,
        userId: 'uuid',
      },
    },
  })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.getById(id, user.userId);
  }

  @Post()
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'Categoria criada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 409, description: 'Uma categoria com este nome já existe' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user, dto);
  }

  @Put(':id')
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ description: 'Categoria atualizada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 409, description: 'Uma categoria com este nome já existe' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Categoria excluída com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para executar esta ação' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 409, description: 'Categoria possui dependências' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.remove(id, user);
  }
}
