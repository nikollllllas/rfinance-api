import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
  ApiHeader,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import {
  TransactionListResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiResponse({ status: 400, description: 'Formato de mês inválido (YYYY-MM)' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.list(user.userId, query.month);
  }

  @Get('months')
  @ApiOkResponse({ type: String, isArray: true, schema: { example: ['2026-03', '2026-02'] } })
  listMonths(@CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.listMonths(user.userId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Transação encontrada', type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Transação não encontrada' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.getById(id, user.userId);
  }

  @Post()
  @ApiBody({ type: CreateTransactionDto })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Opcional. Reenviar a mesma chave devolve o resultado da primeira criação em vez de duplicar (usado pela fila offline do app).',
  })
  @ApiCreatedResponse({
    description: 'Uma transação, ou N parcelas quando installmentCount >= 2',
    type: TransactionListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.create(user, dto, idempotencyKey);
  }

  @Put(':id')
  @ApiBody({ type: UpdateTransactionDto })
  @ApiOkResponse({ description: 'Transação atualizada', type: TransactionResponseDto })
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
  @ApiOkResponse({ type: MessageResponseDto })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.transactionsService.remove(id, user.userId);
  }
}
