import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';

export class BudgetResponseDto {
  @ApiProperty({ example: 'uuid-budget' })
  id!: string;

  @ApiProperty({ example: 'uuid-user' })
  userId!: string;

  @ApiProperty({ example: '500.00', description: 'Valor decimal como string' })
  amount!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ example: 'uuid-category' })
  categoryId!: string;

  @ApiProperty({ example: '2026-03' })
  budgetMonth!: string;

  @ApiPropertyOptional({
    type: () => CategoryResponseDto,
    description: 'Presente em list/getById/update; ausente na resposta de create',
  })
  category?: CategoryResponseDto;
}

export class BudgetProgressResponseDto {
  @ApiProperty({ example: 320.5 })
  current!: number;

  @ApiProperty({ example: 500 })
  max!: number;

  @ApiProperty({ example: 64.1 })
  percentage!: number;

  @ApiProperty({ example: false })
  isOverBudget!: boolean;

  @ApiProperty({ example: '2026-03' })
  budgetMonth!: string;

  @ApiProperty({ example: 'Alimentação' })
  categoryName!: string;

  @ApiProperty({ example: '#22C55E' })
  categoryColor!: string;

  @ApiProperty()
  startDate!: Date;

  @ApiProperty()
  endDate!: Date;
}

export class ReplicateBudgetsResponseDto {
  @ApiProperty({ example: '3 orçamentos replicados com sucesso' })
  message!: string;

  @ApiProperty({ type: () => [BudgetResponseDto] })
  budgets!: BudgetResponseDto[];
}
