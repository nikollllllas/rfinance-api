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
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiResponse({ status: 400, description: 'Formato de mês inválido (YYYY-MM)' })
  @ApiOkResponse({
    schema: {
      example: { transactions: [] },
    },
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.list(user.userId, query.month);
  }

  @Get('months')
  @ApiOkResponse({
    schema: {
      example: ['2026-03', '2026-02'],
    },
  })
  listMonths(@CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.listMonths(user.userId);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Transação encontrada',
  })
  @ApiResponse({ status: 404, description: 'Transação não encontrada' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.getById(id, user.userId);
  }

  @Post()
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({
    schema: {
      example: { transactions: [] },
    },
  })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user, dto);
  }

  @Put(':id')
  @ApiBody({ type: UpdateTransactionDto })
  @ApiOkResponse({ description: 'Transação atualizada' })
  @ApiResponse({ status: 404, description: 'Transação ou categoria não encontrada' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Transação apagada com sucesso',
      },
    },
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.remove(id, user.userId);
  }
}
