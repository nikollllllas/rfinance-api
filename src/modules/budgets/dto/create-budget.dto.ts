import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Matches } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 1200.5 })
  @IsNumber({}, { message: 'Valor precisa ser um número válido' })
  amount!: number;

  @ApiProperty({ example: '2026-03' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'Formato de mês inválido (YYYY-MM)' })
  budgetMonth!: string;

  @ApiProperty({ example: 'uuid-category' })
  @IsUUID('4', { message: 'Categoria inválida' })
  categoryId!: string;
}
