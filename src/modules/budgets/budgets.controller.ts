import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets-query.dto';
import { ReplicateBudgetsDto } from './dto/replicate-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiBody({ type: CreateBudgetDto })
  @ApiCreatedResponse({ description: 'Orçamento criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Já existe um orçamento para essa categoria neste mês',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user, dto);
  }

  @Get()
  @ApiOkResponse({
    schema: {
      example: [],
    },
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBudgetsQueryDto) {
    return this.budgetsService.list(user.userId, query.month);
  }

  @Put()
  @ApiBody({ type: ReplicateBudgetsDto })
  @ApiOkResponse({ description: 'Orçamentos replicados' })
  replicate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReplicateBudgetsDto) {
    return this.budgetsService.replicate(user.userId, dto);
  }

  @Get(':id')
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado' })
  @ApiOkResponse({ description: 'Orçamento encontrado' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.getById(id, user.userId);
  }

  @Put(':id')
  @ApiBody({ type: UpdateBudgetDto })
  @ApiOkResponse({ description: 'Orçamento atualizado' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      example: { message: 'Orçamento apagado com sucesso' },
    },
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.remove(id, user.userId);
  }

  @Get(':id/progress')
  @ApiOkResponse({ description: 'Progresso do orçamento do mês' })
  progress(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.getProgress(id, user.userId);
  }
}
